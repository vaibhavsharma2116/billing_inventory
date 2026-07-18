import storage from '../utils/storage'
import { useState, useEffect, useRef } from 'react'
import { Plus, X, Eye, Download, Trash2, Edit2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL
const PURCHASE_API_URL = `${API_URL}/purchase`
const PRODUCTS_API_URL = `${API_URL}/products`

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const extractPan = (gstin) => {
  if (gstin && gstin.length === 15) {
    return gstin.substring(2, 12);
  }
  return '-';
}

function Purchase() {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [supplierName, setSupplierName] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  // Product modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState(null)
  const [editPurchase, setEditPurchase] = useState(null)
  const [editItems, setEditItems] = useState([])

  const formatCurrency = (amount) => {
    return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const handleView = async (purchase) => {
    try {
      const res = await fetch(`${PURCHASE_API_URL}/${purchase.id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setViewPurchase(data)
      }
    } catch (err) {
      console.error('Failed to fetch purchase details:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This will revert the stock changes.')) {
      return
    }
    try {
      const res = await fetch(`${PURCHASE_API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        fetchPurchases()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete purchase')
      }
    } catch (err) {
      console.error('Failed to delete purchase:', err)
      setError('Failed to delete purchase')
    }
  }

  const handleEdit = async (purchase) => {
    try {
      setLoading(true)
      const res = await fetch(`${PURCHASE_API_URL}/${purchase.id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setEditPurchase(data)
        setEditItems(data.purchaseItems.map(item => ({
          id: item.id,
          productName: item.product?.name || '',
          sku: item.product?.sku || '',
          hsn: item.product?.hsn || '',
          batchNo: item.batchNo || '',
          expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
          qty: item.qty || 0,
          costPrice: item.costPrice || item.rate || 0,
          rate: item.rate || item.costPrice || 0,
          mrp: item.mrp || item.product?.baseSellingPrice || 0,
          gstPercentage: item.gstPercentage || 18,
          total: item.total || 0,
          discount: item.discount || 0
        })))
      }
    } catch (err) {
      console.error('Failed to fetch purchase details for editing:', err)
      setError('Failed to load purchase for editing')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${PURCHASE_API_URL}/${editPurchase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ items: editItems })
      })

      if (res.ok) {
        setEditPurchase(null)
        setEditItems([])
        fetchPurchases()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update purchase')
      }
    } catch (err) {
      console.error('Failed to update purchase:', err)
      setError('Failed to update purchase')
    } finally {
      setLoading(false)
    }
  }

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    hsn: '',
    batchNo: '',
    expiryDate: '',
    costPrice: '',
    baseSellingPrice: '',
    gstPercentage: '',
    currentStock: '0'
  })
  
  const supplierDropdownRef = useRef(null)

  useEffect(() => {
    fetchSuppliers()
  }, [])
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${PURCHASE_API_URL}/suppliers`, { headers: getAuthHeaders() })
      const data = await res.json()
      setSuppliers(data)
      // Set default supplier to first one (which is CSA)
      if (data.length > 0) {
        const firstSupplier = data[0]
        setSupplierName(typeof firstSupplier === 'string' ? firstSupplier : firstSupplier.name)
      }
    } catch (err) {
      console.error('Failed to fetch suppliers')
    }
  }

  const filteredSuppliers = suppliers.filter(s => {
    const name = typeof s === 'string' ? s : s.name
    return name.toLowerCase().includes(supplierName.toLowerCase())
  })

  const selectSupplier = (supplier) => {
    const name = typeof supplier === 'string' ? supplier : supplier.name
    setSupplierName(name)
    setShowSupplierDropdown(false)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setResult(null)
      setError('')
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }
    try {
      setLoading(true)
      setError('')
      setResult(null)
      const formData = new FormData()
      formData.append('file', file)
      if (supplierName) {
        formData.append('supplierName', supplierName)
        const selectedSupplier = suppliers.find(s => {
          const name = typeof s === 'string' ? s : s.name
          return name === supplierName
        })
        if (selectedSupplier && selectedSupplier.id) {
          formData.append('supplierId', selectedSupplier.id)
        }
      }
      const response = await fetch(`${PURCHASE_API_URL}/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })
      const data = await response.json()
      console.log('Upload response:', data)
      if (!response.ok) throw new Error(data.error || data.message || 'Upload failed')
      setResult(data)
      setFile(null) // Clear the file after successful processing
      fetchPurchases()
      fetchSuppliers() // Refresh suppliers list
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    supplierName: ''
  })

  const fetchPurchases = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.fromDate) params.append('fromDate', filters.fromDate)
      if (filters.toDate) params.append('toDate', filters.toDate)
      if (filters.supplierName) params.append('supplierName', filters.supplierName)
      
      const res = await fetch(`${PURCHASE_API_URL}${params.toString() ? `?${params.toString()}` : ''}`, { headers: getAuthHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setPurchases(data)
    } catch (err) {
      console.error('Failed to fetch purchases')
    }
  }

  const resetFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      supplierName: ''
    })
  }

  useEffect(() => {
    fetchPurchases()
  }, [filters])

  const openAddModal = () => {
    setFormData({
      name: '',
      sku: '',
      hsn: '',
      batchNo: '',
      expiryDate: '',
      costPrice: '',
      baseSellingPrice: '',
      gstPercentage: '',
      currentStock: '0'
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(PRODUCTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Failed to add product')
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error adding product:', err)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Purchase Intake</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add New Product
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Upload Supplier Invoice</h2>
        
        {/* Supplier Name Input */}
        <div className="mb-4 relative" ref={supplierDropdownRef}>
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Supplier Name</label>
          <input
            type="text"
            placeholder="Enter supplier name"
            value={supplierName}
            onChange={(e) => { setSupplierName(e.target.value); setShowSupplierDropdown(true); }}
            onFocus={() => setShowSupplierDropdown(true)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showSupplierDropdown && filteredSuppliers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredSuppliers.map((supplier, index) => {
                const name = typeof supplier === 'string' ? supplier : supplier.name
                const isCsa = typeof supplier !== 'string' && supplier.isCsa
                return (
                  <div
                    key={index}
                    onClick={() => selectSupplier(supplier)}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-800">{name}</div>
                      {isCsa && (
                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">CSA</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        <div
          className={`border-2 border-dashed rounded-lg p-6 md:p-10 text-center cursor-pointer transition ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            className="hidden"
            onChange={handleFileChange}
            onClick={(e) => { e.target.value = null }}
          />
          {file ? (
            <div>
              <div className="text-3xl md:text-4xl mb-3">📄</div>
              <div className="font-medium text-gray-800 text-sm md:text-base">{file.name}</div>
              <div className="text-xs md:text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="mt-3 text-red-600 hover:text-red-800 text-xs md:text-sm font-medium"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div>
              <div className="text-4xl md:text-5xl mb-3">📤</div>
              <div className="font-medium text-gray-700 mb-1 text-sm md:text-base">
                Drag & drop your invoice file here
              </div>
              <div className="text-xs md:text-sm text-gray-500">
                or click to browse (Excel .xlsx, .xls, .csv, PDF .pdf)
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 md:px-6 py-3 rounded-lg font-medium transition"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </div>
            ) : (
              'Process Invoice'
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 md:p-6 mb-6">
          <h3 className="text-base md:text-lg font-semibold text-green-800 mb-3">✅ Invoice Processed Successfully!</h3>
          <p className="text-green-700 mb-4 text-sm md:text-base">
            {result.itemsProcessed} items processed. Stock updated automatically!
          </p>
          <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto">
            <h4 className="font-medium text-gray-800 mb-3 text-sm md:text-base">Items:</h4>
            <ul className="space-y-2">
              {result.items && result.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-700">{item.product?.name || 'Unknown Product'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    item.action === 'created'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {item.action} (+{item.quantityAdded})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition h-[42px]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Previous Purchases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">Previous Purchases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Sr. No.</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 md:px-6 py-10 text-center text-gray-500">
                    No purchases yet
                  </td>
                </tr>
              ) : (
                purchases.map((p, index) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm md:text-base">{p.invoiceNo}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{p.supplierName}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 text-sm md:text-base">
                      ₹{typeof p.totalAmount === 'number' ? p.totalAmount.toFixed(2) : parseFloat(p.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleView(p)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition inline-flex items-center mr-2"
                        title="View Purchase"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center mr-2"
                        title="Edit Purchase"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center"
                        title="Delete Purchase"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Add New Product
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsn}
                    onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch No</label>
                  <input
                    type="text"
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.baseSellingPrice}
                    onChange={(e) => setFormData({ ...formData, baseSellingPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Percentage *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.gstPercentage}
                    onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {viewPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-modal-parent">
          <div className="print-content bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-none">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 no-print">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Purchase Invoice Details</h2>
                <p className="text-gray-500 mt-1">Invoice #{viewPurchase.invoiceNo}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewPurchase(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* SCREEN ONLY VIEW */}
              <div className="no-print">
                {/* Purchase Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3 font-mono">Supplier</h3>
                    <p className="font-medium text-gray-800 text-base">{viewPurchase.supplierName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3 font-mono">Purchase Info</h3>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Date:</span> {new Date(viewPurchase.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-2 border-t border-gray-300 pt-2 text-lg">
                      Total: {formatCurrency(viewPurchase.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Purchase Items */}
                <div>
                  <h3 className="text-base font-semibold text-gray-500 uppercase mb-4 font-mono">Purchase Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">No</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">HSN No.</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Qty.</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">MRP</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Rate</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Disc.</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Tax</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewPurchase.purchaseItems?.map((item, idx) => {
                          const qty = parseFloat(item.qty) || 0
                          const rate = parseFloat(item.rate || item.costPrice) || 0
                          const mrp = parseFloat(item.mrp || item.product?.baseSellingPrice) || 0
                          const discountPct = parseFloat(item.discount) || 0
                          const gstPercentage = parseFloat(item.gstPercentage) || 18
                          
                          const taxable = qty * rate
                          const discountAmt = (taxable * discountPct) / 100
                          const taxableAfterDiscount = taxable - discountAmt
                          const taxAmt = (taxableAfterDiscount * gstPercentage) / 100
                          const finalTotal = item.total != null ? parseFloat(item.total) : (taxableAfterDiscount + taxAmt)

                          // Calculate off percentage for MRP
                          const getOffPercentageStr = () => {
                            if (mrp > 0 && rate > 0 && mrp > rate) {
                              const pct = ((mrp - rate) / mrp) * 100
                              return `[${pct.toFixed(2)}% OFF]`
                            }
                            return null
                          }
                          const offPctStr = getOffPercentageStr()

                          return (
                            <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100">
                              <td className="px-3 py-3.5 text-sm text-gray-500 whitespace-nowrap">{idx + 1}</td>
                              <td className="px-3 py-3.5 text-sm font-medium text-gray-800">{item.product?.name || '-'}</td>
                              <td className="px-3 py-3.5 text-sm text-gray-600 whitespace-nowrap">{item.product?.hsn || '-'}</td>
                              <td className="px-3 py-3.5 text-sm text-right text-gray-700 whitespace-nowrap">{qty} PCS</td>
                              <td className="px-3 py-3.5 text-sm text-right whitespace-nowrap">
                                <div className="text-gray-800 font-medium">{mrp > 0 ? formatCurrency(mrp) : '-'}</div>
                                {offPctStr && (
                                  <div className="text-[10px] text-green-600 font-semibold mt-0.5">{offPctStr}</div>
                                )}
                              </td>
                              <td className="px-3 py-3.5 text-sm text-right text-gray-700 whitespace-nowrap">{formatCurrency(rate)}</td>
                              <td className="px-3 py-3.5 text-sm text-right whitespace-nowrap">
                                {discountPct > 0 ? (
                                  <div className="text-red-600 font-medium">{discountPct}%</div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3.5 text-sm text-right whitespace-nowrap">
                                {gstPercentage > 0 ? (
                                  <div className="text-gray-700 font-medium">{gstPercentage}%</div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3.5 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
                                {formatCurrency(finalTotal)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* PRINT ONLY VIEW */}
              {(() => {
                let totalTaxable = 0
                let totalCGST = 0
                let totalSGST = 0
                let totalIGST = 0
                let grandTotal = 0

                viewPurchase.purchaseItems?.forEach(item => {
                  const qty = parseFloat(item.qty) || 0
                  const rate = parseFloat(item.rate || item.costPrice) || 0
                  const discountPct = parseFloat(item.discount) || 0
                  const gstPercentage = parseFloat(item.gstPercentage) || 18

                  const taxable = qty * rate
                  const discountAmt = (taxable * discountPct) / 100
                  const taxableAfterDiscount = taxable - discountAmt
                  const taxAmt = (taxableAfterDiscount * gstPercentage) / 100
                  const finalTotal = item.total != null ? parseFloat(item.total) : (taxableAfterDiscount + taxAmt)

                  totalTaxable += taxableAfterDiscount
                  grandTotal += finalTotal

                  totalCGST += taxAmt / 2
                  totalSGST += taxAmt / 2
                })

                return (
                  <div className="hidden print:block p-6 border-[8px] border-[#cda84f] text-gray-800 font-sans bg-white">
                    {/* Gold header band */}
                    <div className="flex justify-between items-start border-b-2 border-[#cda84f] pb-4 mb-4">
                      <div>
                        <h1 className="text-3xl font-serif font-extrabold text-[#1a2e40] tracking-wide uppercase">
                          {viewPurchase.distributor?.csa?.companyName || viewPurchase.distributor?.csa?.name || viewPurchase.supplierName || 'POPPIK LIFESTYLE PVT LTD'}
                        </h1>
                        <div className="text-[11px] font-semibold text-gray-700 mt-1">
                          <span>PAN No: <strong className="text-gray-900">{viewPurchase.distributor?.csa?.pan || (viewPurchase.distributor?.csa?.gstin ? viewPurchase.distributor.csa.gstin.substring(2, 12) : 'AAQCP0247B')}</strong></span>
                          <span className="mx-3">|</span>
                          <span>GSTIN: <strong className="text-gray-900">{viewPurchase.distributor?.csa?.gstin || '27AAQCP0247B1ZK'}</strong></span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1 flex gap-4">
                          <span>📞 {viewPurchase.distributor?.csa?.phone || '8655324379'}</span>
                          <span>✉ {viewPurchase.distributor?.csa?.email || 'account@poppik.in'}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-lg">
                          {viewPurchase.distributor?.csa?.city ? `${viewPurchase.distributor.csa.city}, Maharashtra` : '213 Sky Lark sector 11 belapur Thane , Thane, Maharashtra, 400614'}
                        </p>
                        <p className="text-[11px] text-blue-600 mt-0.5 font-medium">{viewPurchase.distributor?.csa ? '' : 'web: www.poppiklifestyle.com'}</p>
                      </div>
                      <div className="text-right">
                        <div className="border-2 border-gray-400 p-2 inline-block">
                          <h2 className="text-xl font-bold text-[#1a2e40] tracking-wider uppercase">Tax Invoice</h2>
                        </div>
                        <span className="border border-gray-300 text-[9px] text-gray-500 font-bold uppercase px-2 py-0.5 mt-1.5 block tracking-wide text-center">
                          Original For Recipient
                        </span>
                      </div>
                    </div>

                    {/* Invoice Meta Banner */}
                    <div className="grid grid-cols-3 border-b-2 border-[#cda84f] pb-3 mb-4 text-xs font-semibold">
                      <div>
                        <span className="text-gray-500 uppercase block text-[9px] font-mono tracking-wider">Invoice No.</span>
                        <span className="text-sm font-extrabold text-gray-900">{viewPurchase.invoiceNo}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase block text-[9px] font-mono tracking-wider">Invoice Date</span>
                        <span className="text-sm font-extrabold text-gray-900">{new Date(viewPurchase.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase block text-[9px] font-mono tracking-wider">Due Date</span>
                        <span className="text-sm font-extrabold text-gray-900">
                          {new Date(new Date(viewPurchase.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Bill To & Ship To Box */}
                    <div className="grid grid-cols-2 gap-6 border-b-2 border-[#cda84f] pb-4 mb-4 text-xs">
                      <div className="pr-4 border-r border-[#cda84f]">
                        <h3 className="font-bold text-[#cda84f] uppercase tracking-wider mb-2 text-[10px]">Bill To</h3>
                        <p className="font-extrabold text-sm text-[#1a2e40] mb-1">{viewPurchase.distributor?.companyName || '-'}</p>
                        <p className="text-gray-600 font-semibold mb-1">
                          {viewPurchase.distributor?.city ? `${viewPurchase.distributor.city}, Maharashtra, 411041` : 'Pune, Maharashtra, 411041'}
                        </p>
                        <div className="space-y-0.5 text-gray-700">
                          <p><span className="font-bold text-gray-500">Mobile:</span> {viewPurchase.distributor?.phone || '-'}</p>
                          <p className="font-bold"><span className="font-bold text-gray-500">GSTIN:</span> {viewPurchase.distributor?.gstIn || '-'}</p>
                          <p><span className="font-bold text-gray-500">PAN Number:</span> {extractPan(viewPurchase.distributor?.gstIn)}</p>
                          <p><span className="font-bold text-gray-500">Place of Supply:</span> Maharashtra</p>
                        </div>
                      </div>
                      <div className="pl-4">
                        <h3 className="font-bold text-[#cda84f] uppercase tracking-wider mb-2 text-[10px]">Ship To</h3>
                        <p className="font-extrabold text-sm text-[#1a2e40] mb-1">{viewPurchase.distributor?.companyName || '-'}</p>
                        <p className="text-gray-600 font-semibold mb-1">
                          {viewPurchase.distributor?.city ? `${viewPurchase.distributor.city}, Maharashtra, 411041` : 'Pune, Maharashtra, 411041'}
                        </p>
                        <div className="space-y-0.5 text-gray-700">
                          <p><span className="font-bold text-gray-500">Mobile:</span> {viewPurchase.distributor?.phone || '-'}</p>
                          <p className="font-bold"><span className="font-bold text-gray-500">GSTIN:</span> {viewPurchase.distributor?.gstIn || '-'}</p>
                          <p><span className="font-bold text-gray-500">PAN Number:</span> {extractPan(viewPurchase.distributor?.gstIn)}</p>
                          <p><span className="font-bold text-gray-500">Place of Supply:</span> Maharashtra</p>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full border-collapse border border-gray-200 mb-6">
                      <thead>
                        <tr className="bg-[#fcf8e3]">
                          <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-bold text-gray-700 w-8">No</th>
                          <th className="border border-gray-300 px-2 py-2 text-left text-[10px] font-bold text-gray-700">Items</th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-bold text-gray-700 w-20">HSN No.</th>
                          <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-16">Qty.</th>
                          <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-24">MRP</th>
                          <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-20">Rate</th>
                          <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-20">Disc.</th>
                          <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-20">Tax</th>
                          <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewPurchase.purchaseItems?.map((item, idx) => {
                          const qty = parseFloat(item.qty) || 0
                          const rate = parseFloat(item.rate || item.costPrice) || 0
                          const mrp = parseFloat(item.mrp || item.product?.baseSellingPrice) || 0
                          const discountPct = parseFloat(item.discount) || 0
                          const gstPercentage = parseFloat(item.gstPercentage) || 18
                          
                          const taxable = qty * rate
                          const discountAmt = (taxable * discountPct) / 100
                          const taxableAfterDiscount = taxable - discountAmt
                          const taxAmt = (taxableAfterDiscount * gstPercentage) / 100
                          const finalTotal = item.total != null ? parseFloat(item.total) : (taxableAfterDiscount + taxAmt)

                          const discountPercentageFromMrp = mrp > 0 && rate > 0 && mrp > rate ? ((mrp - rate) / mrp) * 100 : 0

                          return (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-2 py-2 text-xs text-gray-500 text-center">{idx + 1}</td>
                              <td className="px-2 py-2 text-xs font-semibold text-gray-900">{item.product?.name || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600 text-center">{item.product?.hsn || '-'}</td>
                              <td className="px-2 py-2 text-xs text-right text-gray-700 whitespace-nowrap">{qty} PCS</td>
                              <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
                                <div className="text-gray-800 font-semibold">{formatCurrency(mrp)}</div>
                                {discountPercentageFromMrp > 0 && (
                                  <div className="text-[9px] text-green-600 font-bold">({discountPercentageFromMrp.toFixed(2)}% OFF)</div>
                                )}
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-700">{formatCurrency(rate)}</td>
                              <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
                                {discountPct > 0 ? (
                                  <div className="text-red-600 font-semibold">{discountPct}%</div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
                                {taxAmt > 0 ? (
                                  <div className="text-gray-700 font-semibold">{gstPercentage}%</div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-xs text-right font-bold text-gray-900">{formatCurrency(finalTotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Summary Totals block */}
                    <div className="flex flex-col items-end gap-1.5 border-t-2 border-[#cda84f] pt-4 mt-4">
                      <div className="flex justify-between w-64 text-xs">
                        <span className="text-gray-600 font-semibold">Taxable Value:</span>
                        <span className="font-bold text-gray-850">{formatCurrency(totalTaxable)}</span>
                      </div>
                      {(totalCGST > 0 || (totalIGST === 0 && totalCGST === 0)) && (
                        <div className="flex justify-between w-64 text-xs">
                          <span className="text-gray-600 font-semibold">CGST:</span>
                          <span className="font-bold text-gray-850">{formatCurrency(totalCGST)}</span>
                        </div>
                      )}
                      {(totalSGST > 0 || (totalIGST === 0 && totalSGST === 0)) && (
                        <div className="flex justify-between w-64 text-xs">
                          <span className="text-gray-600 font-semibold">SGST:</span>
                          <span className="font-bold text-gray-850">{formatCurrency(totalSGST)}</span>
                        </div>
                      )}
                      {totalIGST > 0 && (
                        <div className="flex justify-between w-64 text-xs">
                          <span className="text-gray-600 font-semibold">IGST:</span>
                          <span className="font-bold text-gray-850">{formatCurrency(totalIGST)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-1.5 flex justify-between w-64 text-sm font-extrabold text-gray-950 mt-1">
                        <span className="text-[#1a2e40]">Grand Total:</span>
                        <span className="text-green-600 text-base">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>

                    {/* Fine print footer */}
                    <div className="text-center text-[10px] text-gray-400 border-t border-gray-200 pt-3 mt-8">
                      This is a computer-generated tax invoice and does not require signature.
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Edit Purchase Modal */}
      {editPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              
              <div className="bg-gray-50 px-6 py-2 rounded-full border border-gray-200">
                <span className="font-semibold text-gray-800">
                  Total: {formatCurrency(editItems.reduce((sum, item) => sum + (parseFloat(item.total) || (parseFloat(item.rate) * parseInt(item.qty)) || 0), 0))}
                </span>
              </div>
              
              <button
                onClick={() => { setEditPurchase(null); setEditItems([]) }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">No</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">HSN No.</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Qty.</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">MRP</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Rate</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Disc.</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Tax</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Total</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {editItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-3 py-3.5 text-sm text-gray-500 whitespace-nowrap">{index + 1}</td>
                        <td className="px-1 py-2">
                          <input 
                            type="text" 
                            value={item.productName} 
                            onChange={(e) => {
                              const newItems = [...editItems]
                              newItems[index].productName = e.target.value
                              setEditItems(newItems)
                            }}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input 
                            type="text" 
                            value={item.hsn} 
                            onChange={(e) => {
                              const newItems = [...editItems]
                              newItems[index].hsn = e.target.value
                              setEditItems(newItems)
                            }}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input 
                            type="number" 
                            value={item.qty} 
                            onChange={(e) => {
                              const newItems = [...editItems]
                              newItems[index].qty = parseInt(e.target.value) || 0
                              newItems[index].total = newItems[index].qty * newItems[index].rate
                              setEditItems(newItems)
                            }}
                            className="w-full p-1 border rounded text-xs text-right"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input 
                            type="number" step="0.01"
                            value={item.mrp} 
                            onChange={(e) => {
                              const newItems = [...editItems]
                              newItems[index].mrp = parseFloat(e.target.value) || 0
                              setEditItems(newItems)
                            }}
                            className="w-full p-1 border rounded text-xs text-right"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input 
                            type="number" step="0.01"
                            value={item.rate} 
                            onChange={(e) => {
                              const newItems = [...editItems]
                              newItems[index].rate = parseFloat(e.target.value) || 0
                              newItems[index].costPrice = newItems[index].rate
                              newItems[index].total = newItems[index].qty * newItems[index].rate
                              setEditItems(newItems)
                            }}
                            className="w-full p-1 border rounded text-xs text-right"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" step="0.01"
                              value={item.discount} 
                              onChange={(e) => {
                                const newItems = [...editItems]
                                newItems[index].discount = parseFloat(e.target.value) || 0
                                setEditItems(newItems)
                              }}
                              className="w-full p-1 border rounded text-xs text-right"
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        </td>
                        <td className="px-1 py-2">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" step="0.01"
                              value={item.gstPercentage} 
                              onChange={(e) => {
                                const newItems = [...editItems]
                                newItems[index].gstPercentage = parseFloat(e.target.value) || 0
                                setEditItems(newItems)
                              }}
                              className="w-full p-1 border rounded text-xs text-right"
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        </td>
                        <td className="px-1 py-2 text-right font-semibold text-gray-900 whitespace-nowrap text-sm">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = editItems.filter((_, i) => i !== index)
                              setEditItems(newItems)
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setEditItems([
                    ...editItems, 
                    {
                      productName: '', sku: '', hsn: '', qty: 1, rate: 0, costPrice: 0, mrp: 0, gstPercentage: 18, total: 0, discount: 0
                    }
                  ])}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Plus size={16} /> Add Item Row
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Purchase

