import storage from '../utils/storage'
import { useState, useEffect } from 'react'
import { Plus, X, Eye, Trash2, ShoppingCart, CheckCircle, Clock, XCircle, Download } from 'lucide-react'
import { downloadPurchaseReceiptPDF } from '../utils/purchaseReceiptGenerator'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (amount) => {
  return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function CSAMyPurchase() {
  const user = JSON.parse(storage.getItem('user') || '{}')
  const [purchases, setPurchases] = useState([])
  const [filteredPurchases, setFilteredPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  
  const [loading, setLoading] = useState(false)
  
  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState(null)
  
  // Order state
  const [selectedSupplier, setSelectedSupplier] = useState({ id: null, name: '' })
  const [orderItems, setOrderItems] = useState([]) // Array of { product, qty }
  const [searchQuery, setSearchQuery] = useState('')
  
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    supplierName: ''
  })

  useEffect(() => {
    fetchPurchases()
    fetchSuppliers()
    fetchProducts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [purchases, filters])

  const fetchPurchases = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-purchases`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setPurchases(data)
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
        const formattedSuppliers = data.map(s => typeof s === 'string' ? { id: s, name: s, isNameOnly: true } : s)
        setSuppliers(formattedSuppliers)
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-products`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

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

  const handleQuantityChange = (product, change) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      const currentQty = existing ? existing.qty : 0
      const newQty = Math.max(0, currentQty + change)
      
      if (newQty === 0) {
        return prev.filter(item => item.product.id !== product.id)
      }
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: newQty } : item)
      }
      return [...prev, { product, qty: newQty }]
    })
  }

  const getProductQty = (productId) => {
    const item = orderItems.find(i => i.product.id === productId)
    return item ? item.qty : 0
  }

  const handleReviewOrder = () => {
    if (orderItems.length === 0) {
      alert('Please select at least one item.')
      return
    }
    if (!selectedSupplier.name) {
      alert('Please select a supplier.')
      return
    }
    setIsReviewOpen(true)
  }

  const submitOrder = async () => {
    try {
      setLoading(true)
      const items = orderItems.map(item => ({
        productId: item.product.id,
        qty: item.qty,
        costPrice: item.product.costPrice,
        baseSellingPrice: item.product.baseSellingPrice,
        hsn: item.product.hsn
      }))

      const payload = {
        supplierName: selectedSupplier.name,
        supplierId: selectedSupplier.id,
        items
      }

      const res = await fetch(`${API_URL}/csa/my-purchases/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        alert('Order request submitted successfully!')
        setOrderItems([])
        setSelectedSupplier({ id: null, name: '' })
        setIsReviewOpen(false)
        setIsOrderModalOpen(false)
        fetchPurchases()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to submit order request')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred while submitting order.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (purchaseId) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return
    try {
      const res = await fetch(`${API_URL}/csa/my-purchases/${purchaseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) fetchPurchases()
    } catch (err) {
      console.error('Failed to delete purchase:', err)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>
      case 'PENDING': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>
      case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500">Create new orders and view purchase history.</p>
        </div>
        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Create Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
            <select
              value={filters.supplierName}
              onChange={(e) => setFilters({ ...filters, supplierName: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s, i) => (
                <option key={i} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={() => setFilters({ fromDate: '', toDate: '', supplierName: '' })}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Purchase List */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No purchase history found. Create an order to get started.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.invoiceNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.supplierName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(p.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => downloadPurchaseReceiptPDF(p, user)} 
                          className="text-green-600 hover:text-green-900 mr-4"
                          title="Download Receipt"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewPurchase(p)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="View Details">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ORDER MODAL */}
      {isOrderModalOpen && !isReviewOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] h-[95vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Order</h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier</label>
                <select
                  value={selectedSupplier.name}
                  onChange={(e) => {
                    const s = suppliers.find(sup => sup.name === e.target.value)
                    if (s) setSelectedSupplier({ id: s.isNameOnly ? null : s.id, name: s.name })
                    else setSelectedSupplier({ id: null, name: '' })
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s, idx) => (
                    <option key={idx} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
                <input 
                  type="text" 
                  placeholder="Search by name or SKU..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col bg-gray-100 overflow-hidden">
              <div className="bg-white rounded shadow flex flex-col flex-1 overflow-hidden">
                <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex-none">
                  ALL PRODUCTS
                </div>
                <div className="overflow-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase bg-gray-50">S.NO</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase bg-gray-50">Product Name</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">MRP</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">Item Unit</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">Today Stock</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">Price</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">Quantity</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">Total Tax</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase bg-gray-50">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {products
                        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((product, idx) => {
                        const qty = getProductQty(product.id);
                        const totalCost = qty * (product.costPrice || 0);
                        const tax = totalCost * ((product.gstPercentage || 18) / 100);
                        return (
                          <tr key={product.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <td className="px-3 py-3 text-gray-900">{idx + 1}</td>
                            <td className="px-3 py-3 text-gray-900 font-medium whitespace-nowrap">{product.name}</td>
                            <td className="px-3 py-3 text-center text-gray-500">{product.baseSellingPrice || 0}</td>
                            <td className="px-3 py-3 text-center text-gray-500">1</td>
                            <td className="px-3 py-3 text-center text-gray-500">{product.currentStock}</td>
                            <td className="px-3 py-3 text-center text-gray-500">{product.costPrice || 0}</td>
                            <td className="px-3 py-3 text-center">
                              <input 
                                type="number"
                                min="0"
                                value={qty || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  handleQuantityChange(product, val - qty);
                                }}
                                className={`w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none text-center ${qty > 0 ? 'bg-yellow-300' : 'bg-yellow-100'}`}
                              />
                            </td>
                            <td className="px-3 py-3 text-center text-gray-500">{tax.toFixed(2)}</td>
                            <td className="px-3 py-3 text-center text-gray-900 font-medium">{totalCost.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center rounded-b-lg">
              <div>
                <span className="text-sm text-gray-500">Total Items: </span>
                <span className="font-semibold text-gray-900">{orderItems.reduce((acc, item) => acc + item.qty, 0)}</span>
              </div>
              <div className="space-x-3">
                <button onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                <button onClick={handleReviewOrder} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Review Order</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW ORDER MODAL */}
      {isReviewOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Review Order Request</h2>
              <button onClick={() => setIsReviewOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="text-lg font-medium text-gray-900">{selectedSupplier.name}</p>
              </div>
              
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {orderItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.product.costPrice)}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(item.qty * parseFloat(item.product.costPrice))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="3" className="px-4 py-3 text-right text-gray-900">Grand Total:</td>
                    <td className="px-4 py-3 text-right text-indigo-600">
                      {formatCurrency(orderItems.reduce((acc, item) => acc + (item.qty * parseFloat(item.product.costPrice || 0)), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button onClick={() => setIsReviewOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">Back to Edit</button>
              <button onClick={submitOrder} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewPurchase && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Order Request Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Req No: {viewPurchase.invoiceNo} | Date: {new Date(viewPurchase.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setViewPurchase(null)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Supplier</h3>
                  <p className="mt-1 text-lg text-gray-900">{viewPurchase.supplierName}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">{getStatusBadge(viewPurchase.status)}</div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Requested Items</h4>
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewPurchase.purchaseItems?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product?.name || 'Unknown Product'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.qty}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.rate || item.costPrice)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-medium text-gray-900 bg-gray-50">Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600 bg-gray-50">{formatCurrency(viewPurchase.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAMyPurchase