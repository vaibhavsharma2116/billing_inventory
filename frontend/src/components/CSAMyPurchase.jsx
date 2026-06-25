import { useState, useEffect } from 'react'
import { Plus, X, Eye, Trash2, RefreshCw, Download } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (amount) => {
  return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function CSAMyPurchase() {
  const [purchases, setPurchases] = useState([])
  const [filteredPurchases, setFilteredPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState({ id: null, name: '' })
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    supplierName: ''
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState(null)
  const [isEditingPurchase, setIsEditingPurchase] = useState(false)
  const [editItems, setEditItems] = useState([])
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

  const fetchPurchases = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-purchases`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setPurchases(data)
        setFilteredPurchases(data)
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-suppliers`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        // Convert to array of objects with id and name if needed
        const formattedSuppliers = data.map(s => typeof s === 'string' ? { id: s, name: s, isNameOnly: true } : s)
        setSuppliers(formattedSuppliers)
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchases()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [purchases, filters])

  const applyFilters = () => {
    let filtered = [...purchases]

    if (filters.supplierName) {
      filtered = filtered.filter(p => p.supplierName === filters.supplierName)
    }
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(p => new Date(p.createdAt) >= fromDate)
    }
    if (filters.toDate) {
      const toDate = new Date(filters.toDate)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(p => new Date(p.createdAt) <= toDate)
    }
    setFilteredPurchases(filtered)
  }

  const resetFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      supplierName: ''
    })
  }

  const handleView = async (purchase) => {
    try {
      const res = await fetch(`${API_URL}/csa/my-purchases/${purchase.id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setViewPurchase(data)
        setIsEditingPurchase(false)
      }
    } catch (err) {
      console.error('Failed to fetch purchase:', err)
    }
  }

  const handleEditClick = () => {
    setEditItems(viewPurchase.purchaseItems.map(item => ({
      id: item.id,
      productName: item.product?.name || '',
      hsn: item.product?.hsn || '',
      qty: parseInt(item.qty) || 0,
      mrp: parseFloat(item.mrp || item.product?.baseSellingPrice) || 0,
      rate: parseFloat(item.rate || item.costPrice) || 0,
      discount: parseFloat(item.discount) || 0,
      gstPercentage: parseFloat(item.gstPercentage) || 18,
      total: parseFloat(item.total) || 0
    })))
    setIsEditingPurchase(true)
  }

  const handleItemChange = (idx, field, value) => {
    const newItems = [...editItems]
    newItems[idx][field] = value
    
    // Auto-calculate total if qty, rate, discount, or gst changes
    if (['qty', 'rate', 'discount', 'gstPercentage'].includes(field)) {
      const qty = parseFloat(newItems[idx].qty) || 0
      const rate = parseFloat(newItems[idx].rate) || 0
      const discount = parseFloat(newItems[idx].discount) || 0
      const gst = parseFloat(newItems[idx].gstPercentage) || 0
      
      const taxable = qty * rate
      const discountAmt = (taxable * discount) / 100
      const taxableAfterDiscount = taxable - discountAmt
      const taxAmt = (taxableAfterDiscount * gst) / 100
      newItems[idx].total = taxableAfterDiscount + taxAmt
    }
    
    setEditItems(newItems)
  }

  const handleSaveEdit = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/csa/my-purchases/${viewPurchase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ items: editItems })
      })
      if (res.ok) {
        setIsEditingPurchase(false)
        fetchPurchases()
        handleView({ id: viewPurchase.id })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update purchase')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update purchase')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (purchaseId) => {
    if (!confirm('Are you sure you want to delete this purchase?')) {
      return
    }
    try {
      const res = await fetch(`${API_URL}/csa/my-purchases/${purchaseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        fetchPurchases()
      }
    } catch (err) {
      console.error('Failed to delete purchase:', err)
    }
  }

  const handlePrint = () => {
    window.print()
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
      const formData = new FormData()
      formData.append('file', file)
      if (selectedSupplier.name) {
        formData.append('supplierName', selectedSupplier.name)
      }
      if (selectedSupplier.id && !selectedSupplier.isNameOnly) {
        formData.append('supplierId', selectedSupplier.id)
      }
      const res = await fetch(`${API_URL}/csa/my-purchases/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Upload failed')
      setResult(data)
      setFile(null) // Clear the file after successful processing
      fetchPurchases()
      fetchSuppliers()
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
      const res = await fetch(`${API_URL}/csa/my-products`, {
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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Purchase Bills</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPurchases}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={20} />
            Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Upload Supplier Invoice</h2>
        
        {/* Supplier Select Dropdown */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Supplier Name</label>
          <select
            value={selectedSupplier.id || ''}
            onChange={(e) => {
              const supplier = suppliers.find(s => s.id === e.target.value);
              if (supplier) {
                setSelectedSupplier(supplier);
              } else {
                setSelectedSupplier({ id: null, name: '' });
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>
        
        <div
          className={`border-2 border-dashed rounded-lg p-6 md:p-10 text-center cursor-pointer transition ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input-my').click()}
        >
          <input
            id="file-input-my"
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
        <div className="bg-green-100 border border-green-300 rounded-xl p-4 md:p-6 mb-6">
          <h3 className="text-base md:text-lg font-semibold text-green-800 mb-3">✅ Invoice Processed Successfully!</h3>
          <p className="text-green-700 mb-4 text-sm md:text-base">
            {result.itemsProcessed} items processed. Stock updated automatically!
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Filter Purchases</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              value={filters.supplierName}
              onChange={(e) => setFilters({ ...filters, supplierName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s, idx) => (
                <option key={idx} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Previous Purchases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">My Purchase History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Sr. No</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 md:px-6 py-10 text-center text-gray-500">
                    No purchases yet
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, index) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm md:text-base">{p.invoiceNo}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{p.supplierName}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 text-sm md:text-base">
                      {formatCurrency(p.totalAmount)}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(p)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="View Purchase"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Delete Purchase"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Product
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsn}
                    onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-modal-parent print:bg-transparent print:p-0">
          <div className="print-content bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:max-h-none print:shadow-none print:rounded-none print:overflow-visible">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditingPurchase ? 'Edit Purchase Details' : 'Purchase Details'}
                </h2>
                <p className="text-gray-500 mt-1">Invoice #{viewPurchase.invoiceNo}</p>
              </div>
              <div className="flex items-center gap-3">
                {isEditingPurchase ? (
                  <>
                    <button
                      onClick={() => setIsEditingPurchase(false)}
                      className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditClick}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handlePrint}
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
                  </>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Purchase Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Supplier</h3>
                  <p className="font-medium text-gray-800">{viewPurchase.supplierName}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Purchase Info</h3>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span> {new Date(viewPurchase.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-2 border-t border-gray-300 pt-2">
                    Total: {formatCurrency(viewPurchase.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Purchase Items */}
              <div className="print:mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-2">Items</h3>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full print:text-[10px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12 print:px-1 print:py-1 print:text-[9px]">No</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:px-1 print:py-1 print:text-[9px]">Items</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24 print:px-1 print:py-1 print:text-[9px]">HSN No.</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20 print:px-1 print:py-1 print:text-[9px]">Qty.</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32 print:px-1 print:py-1 print:text-[9px]">MRP</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24 print:px-1 print:py-1 print:text-[9px]">Rate</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 print:px-1 print:py-1 print:text-[9px]">Disc.</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 print:px-1 print:py-1 print:text-[9px]">Tax</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 print:px-1 print:py-1 print:text-[9px]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {isEditingPurchase ? (
                        editItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100">
                            <td className="px-3 py-3.5 text-sm text-gray-500 whitespace-nowrap">{idx + 1}</td>
                            <td className="px-1 py-2">
                              <input 
                                type="text" 
                                value={item.productName} 
                                onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                                className="w-full p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input 
                                type="text" 
                                value={item.hsn} 
                                onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                                className="w-full p-1 border rounded text-xs"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input 
                                type="number" 
                                value={item.qty} 
                                onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                className="w-full p-1 border rounded text-xs text-right"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input 
                                type="number" step="0.01"
                                value={item.mrp} 
                                onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                                className="w-full p-1 border rounded text-xs text-right"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <input 
                                type="number" step="0.01"
                                value={item.rate} 
                                onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                className="w-full p-1 border rounded text-xs text-right"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" step="0.01"
                                  value={item.discount} 
                                  onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
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
                                  onChange={(e) => handleItemChange(idx, 'gstPercentage', e.target.value)}
                                  className="w-full p-1 border rounded text-xs text-right"
                                />
                                <span className="text-xs text-gray-500">%</span>
                              </div>
                            </td>
                            <td className="px-1 py-2 text-right font-semibold text-gray-900 whitespace-nowrap text-sm">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        viewPurchase.purchaseItems?.map((item, idx) => {
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
                            <td className="px-3 py-3.5 text-sm text-gray-500 whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">{idx + 1}</td>
                            <td className="px-3 py-3.5 text-sm font-medium text-gray-800 print:px-1 print:py-1.5 print:text-[10px]">{item.product?.name || '-'}</td>
                            <td className="px-3 py-3.5 text-sm text-gray-600 whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">{item.product?.hsn || '-'}</td>
                            <td className="px-3 py-3.5 text-sm text-right text-gray-700 whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">{qty} PCS</td>
                            <td className="px-3 py-3.5 text-sm text-right whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">
                              <div className="text-gray-800 font-medium">{mrp > 0 ? formatCurrency(mrp) : '-'}</div>
                              {offPctStr && (
                                <div className="text-[10px] text-green-600 font-semibold mt-0.5">{offPctStr}</div>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-sm text-right text-gray-700 whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">{formatCurrency(rate)}</td>
                            <td className="px-3 py-3.5 text-sm text-right whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">
                              {discountAmt > 0 ? (
                                <>
                                  <div className="text-red-600 font-medium">{formatCurrency(discountAmt)}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">({discountPct}%)</div>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-sm text-right whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">
                              {taxAmt > 0 ? (
                                <>
                                  <div className="text-gray-700 font-medium">{formatCurrency(taxAmt)}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">({gstPercentage}%)</div>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-sm text-right font-semibold text-gray-900 whitespace-nowrap print:px-1 print:py-1.5 print:text-[10px]">
                              {formatCurrency(finalTotal)}
                            </td>
                          </tr>
                        )
                      })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAMyPurchase