import { useState, useEffect } from 'react'
import { Plus, X, Upload } from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function SuperAdminProducts() {
  const [products, setProducts] = useState([])
  const [distributors, setDistributors] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDistributor, setSelectedDistributor] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    hsn: '',
    batchNo: '',
    expiryDate: '',
    costPrice: '',
    baseSellingPrice: '',
    gstPercentage: '',
    currentStock: '0',
    distributorId: '',
    addToAllDistributors: false
  })
  // Upload state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadDistributorId, setUploadDistributorId] = useState('')
  const [uploadAddToAll, setUploadAddToAll] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchDistributors()
  }, [search, selectedDistributor])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedDistributor) params.append('distributorId', selectedDistributor)
      
      const res = await fetch(`${API_URL}/superadmin/products${params.toString() ? `?${params.toString()}` : ''}`, { 
        headers: getAuthHeaders() 
      })
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      setError('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/superadmin/distributors`, { 
        headers: getAuthHeaders() 
      })
      const data = await res.json()
      setDistributors(data)
    } catch (err) {
      console.error('Failed to fetch distributors')
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      sku: '',
      hsn: '',
      batchNo: '',
      expiryDate: '',
      costPrice: '',
      baseSellingPrice: '',
      gstPercentage: '',
      currentStock: '0',
      distributorId: '',
      addToAllDistributors: false
    })
    setIsModalOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      name: typeof product.name === 'string' ? product.name : '',
      sku: typeof product.sku === 'string' ? product.sku : '',
      hsn: typeof product.hsn === 'string' ? product.hsn : '',
      batchNo: typeof product.batchNo === 'string' ? product.batchNo : '',
      expiryDate: product.expiryDate ? (typeof product.expiryDate === 'string' ? product.expiryDate.split('T')[0] : '') : '',
      costPrice: typeof product.costPrice === 'number' ? product.costPrice.toString() : '0',
      baseSellingPrice: typeof product.baseSellingPrice === 'number' ? product.baseSellingPrice.toString() : '0',
      gstPercentage: typeof product.gstPercentage === 'number' ? product.gstPercentage.toString() : '0',
      currentStock: typeof product.currentStock === 'number' ? product.currentStock.toString() : '0',
      distributorId: product.distributorId || '',
      addToAllDistributors: false
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      if (editingProduct) {
        const res = await fetch(`${API_URL}/superadmin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(formData)
        })
        if (!res.ok) throw new Error('Failed to update product')
      } else {
        const res = await fetch(`${API_URL}/superadmin/products`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(formData)
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to create product')
        }
        const data = await res.json()
        if (data.message) alert(data.message)
      }
      
      setIsModalOpen(false)
      fetchProducts()
    } catch (err) {
      setError(err.message || 'Failed to save product')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    try {
      await fetch(`${API_URL}/superadmin/products/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      fetchProducts()
    } catch (err) {
      setError('Failed to delete product')
    }
  }

  // Upload functions
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
      setUploadFile(e.dataTransfer.files[0])
      setUploadResult(null)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setUploadFile(e.target.files[0])
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file first')
      return
    }
    if (!uploadAddToAll && !uploadDistributorId) {
      setError('Either select a distributor or check "Add to All Distributors"')
      return
    }
    try {
      setUploadLoading(true)
      setError('')
      setUploadResult(null)
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadAddToAll) {
        formData.append('addToAllDistributors', 'true')
      } else {
        formData.append('distributorId', uploadDistributorId)
      }
      const response = await fetch(`${API_URL}/superadmin/products/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')
      setUploadResult(data)
      fetchProducts()
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploadLoading(false)
    }
  }

  const isLowStock = (stock) => stock < 10
  const isNearExpiry = (expiry) => {
    if (!expiry) return false
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return new Date(expiry) <= thirtyDaysFromNow
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventory & Products (Super Admin)</h1>
        <button
          onClick={openAddModal}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
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

      {/* Upload Section */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Upload Products via Excel</h2>
        
        {/* Distributor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Distributor</label>
            <select
              value={uploadDistributorId}
              onChange={(e) => { setUploadDistributorId(e.target.value); }}
              disabled={uploadAddToAll}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
            >
              <option key="select-distributor" value="">Select Distributor</option>
              {distributors.map((d, index) => (
                <option key={d.id || `distributor-${index}`} value={d.id}>{d.companyName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={uploadAddToAll}
                onChange={(e) => setUploadAddToAll(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Add to All Distributors</span>
            </label>
          </div>
        </div>
        
        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 md:p-10 text-center cursor-pointer transition ${
            dragActive ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('product-file-input').click()}
        >
          <input
            id="product-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploadFile ? (
            <div>
              <div className="text-3xl md:text-4xl mb-3">📄</div>
              <div className="font-medium text-gray-800 text-sm md:text-base">{uploadFile.name}</div>
              <div className="text-xs md:text-sm text-gray-500 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</div>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadResult(null); }}
                className="mt-3 text-red-600 hover:text-red-800 text-xs md:text-sm font-medium"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div>
              <div className="text-4xl md:text-5xl mb-3">📤</div>
              <div className="font-medium text-gray-700 mb-1 text-sm md:text-base">
                Drag & drop your product file here
              </div>
              <div className="text-xs md:text-sm text-gray-500">
                or click to browse (Excel .xlsx, .xls, .csv)
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="mt-4">
          <button
            onClick={handleUpload}
            disabled={uploadLoading || !uploadFile}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm md:text-base font-medium rounded-lg md:rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 transition-all w-full md:w-auto"
          >
            <Upload size={16} className="md:w-5 md:h-5" />
            {uploadLoading ? 'Uploading...' : 'Upload Products'}
          </button>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 font-medium">{uploadResult.message}</div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, SKU, or HSN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedDistributor}
              onChange={(e) => setSelectedDistributor(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option key="all-distributors" value="">All Distributors</option>
              {distributors.map((d, index) => (
                <option key={d.id || `distributor-${index}`} value={d.id}>{d.companyName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Distributor</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">HSN</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost Price</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Selling Price</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiry</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 md:px-6 py-10 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-medium text-gray-900 text-sm md:text-base">
                          {product.distributor?.companyName || '-'}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-medium text-gray-900 text-sm md:text-base">{typeof product.name === 'string' ? product.name : '-'}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 font-mono text-xs md:text-sm">{typeof product.sku === 'string' ? product.sku : '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 font-mono text-xs md:text-sm">{typeof product.hsn === 'string' && product.hsn ? product.hsn : '-'}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isLowStock(product.currentStock)
                            ? 'bg-orange-100 text-orange-800'
                            : product.currentStock > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.currentStock} in stock
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">₹{product.costPrice}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-900 font-medium text-sm md:text-base">₹{product.baseSellingPrice}</td>
                      <td className="px-4 md:px-6 py-4">
                        {product.expiryDate ? (
                          <span className={`${isNearExpiry(product.expiryDate) ? 'text-red-600 font-medium' : 'text-gray-600'} text-sm md:text-base`}>
                            {new Date(product.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm md:text-base">-</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm md:text-base"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              {!editingProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distributor</label>
                    <select
                      value={formData.distributorId}
                      onChange={(e) => setFormData({...formData, distributorId: e.target.value})}
                      disabled={formData.addToAllDistributors}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
                    >
                      <option key="modal-select-distributor" value="">Select Distributor</option>
                      {distributors.map((d) => (
                        <option key={d.id} value={d.id}>{d.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={formData.addToAllDistributors}
                        onChange={(e) => setFormData({...formData, addToAllDistributors: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Add to All Distributors</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsn}
                    onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg font-medium transition"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminProducts
