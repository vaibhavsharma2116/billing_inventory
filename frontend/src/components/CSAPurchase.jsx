import storage from '../utils/storage'
import { useState, useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function CSAPurchase() {
  const [distributors, setDistributors] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false)
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
  const distributorDropdownRef = useRef(null)

  useEffect(() => {
    fetchDistributors()
  }, [])

  const fetchDistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/distributors`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setDistributors(data || [])
        const savedId = storage.getItem('csaDistributorId')
        if (savedId) {
          const found = data.find(d => d.distributorId === savedId || d.id === savedId)
          if (found) {
            selectDistributor(found)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch distributors')
    }
  }

  const selectDistributor = async (dist) => {
    const distId = dist.distributorId || dist.id
    setSelectedDistributor(dist)
    storage.setItem('csaDistributorId', distId)
    setShowDistributorDropdown(false)
    fetchPurchases()
    fetchSuppliers()
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierDropdown(false)
      }
      if (distributorDropdownRef.current && !distributorDropdownRef.current.contains(event.target)) {
        setShowDistributorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchSuppliers = async () => {
    if (!selectedDistributor) return
    try {
      const distId = selectedDistributor.distributorId || selectedDistributor.id
      const res = await fetch(`${API_URL}/csa/distributors/${distId}/purchase/suppliers`, { headers: getAuthHeaders() })
      if (res.ok) {
        setSuppliers(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch suppliers')
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    typeof s === 'string' && s.toLowerCase().includes(supplierName.toLowerCase())
  )

  const selectSupplier = (supplier) => {
    setSupplierName(supplier)
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
    if (!selectedDistributor) {
      setError('Please select a distributor first')
      return
    }
    if (!file) {
      setError('Please select a file first')
      return
    }
    try {
      setLoading(true)
      setError('')
      const formData = new FormData()
      formData.append('file', file)
      if (supplierName) {
        formData.append('supplierName', supplierName)
      }
      const distId = selectedDistributor.distributorId || selectedDistributor.id
      const response = await fetch(`${API_URL}/csa/distributors/${distId}/purchase/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })
      const data = await response.json()
      console.log('Upload response:', data)
      if (!response.ok) throw new Error(data.error || data.message || 'Upload failed')
      setResult(data)
      fetchPurchases()
      fetchSuppliers()
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    if (!selectedDistributor) return
    try {
      const distId = selectedDistributor.distributorId || selectedDistributor.id
      const res = await fetch(`${API_URL}/csa/distributors/${distId}/purchase`, { headers: getAuthHeaders() })
      if (res.ok) {
        setPurchases(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch purchases')
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
    if (!selectedDistributor) {
      setError('Please select a distributor first')
      return
    }
    try {
      const distId = selectedDistributor.distributorId || selectedDistributor.id
      const res = await fetch(`${API_URL}/csa/distributors/${distId}/products`, {
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Purchase Intake</h1>
        </div>
        {selectedDistributor && (
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={20} />
            Add New Product
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Distributor Dropdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="relative" ref={distributorDropdownRef}>
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Select Distributor</label>
          <div
            onClick={() => setShowDistributorDropdown(!showDistributorDropdown)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer flex items-center justify-between"
          >
            <span className={selectedDistributor ? "text-gray-900 font-medium" : "text-gray-500"}>
              {selectedDistributor ? selectedDistributor.companyName : "Select a distributor"}
            </span>
            <span className="text-gray-500">▼</span>
          </div>
          {showDistributorDropdown && distributors.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {distributors.map(d => (
                <div
                  key={d.distributorId || d.id}
                  onClick={() => selectDistributor(d)}
                  className={`px-4 py-3 cursor-pointer transition hover:bg-gray-50 ${
                    selectedDistributor?.id === d.id || selectedDistributor?.distributorId === d.distributorId
                      ? "bg-pink-50"
                      : ""
                  }`}
                >
                  <div className="font-medium text-gray-800">{d.companyName}</div>
                  <div className="text-sm text-gray-500">{d.ownerName} • {d.city}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDistributor && (
        <>
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
                onChange={(e) => { setSupplierName(e.target.value); setShowSupplierDropdown(true) }}
                onFocus={() => setShowSupplierDropdown(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuppliers.map((supplier, index) => (
                    <div
                      key={index}
                      onClick={() => selectSupplier(supplier)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-800">{supplier}</div>
                    </div>
                  ))}
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
                accept=".xlsx,.xls,.csv"
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
                    or click to browse (Excel .xlsx, .xls, .csv)
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

          {/* Previous Purchases */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Previous Purchases</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 md:px-6 py-10 text-center text-gray-500">
                        No purchases yet
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm md:text-base">{p.invoiceNo}</td>
                        <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{p.supplierName}</td>
                        <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 text-sm md:text-base">
                          ₹{typeof p.totalAmount === 'number' ? p.totalAmount.toFixed(2) : parseFloat(p.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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
    </div>
  )
}

export default CSAPurchase