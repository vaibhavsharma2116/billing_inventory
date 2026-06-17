import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL
const DISTRIBUTOR_STATE_CODE = '27' // Maharashtra as default

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function CSAMyBilling() {
  const navigate = useNavigate()
  
  const [distributors, setDistributors] = useState([])
  const [products, setProducts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [searchDistributor, setSearchDistributor] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedInvoice, setSavedInvoice] = useState(null)
  const printRef = useRef(null)
  const distributorDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)

  useEffect(() => {
    fetchDistributors()
    fetchCurrentUser()
    fetchCSAProducts() // Added to fetch CSA's own products on load
  }, [])

  const fetchCSAProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-products`, { headers: getAuthHeaders() })
      if (res.ok) {
        setProducts(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch products')
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, { headers: getAuthHeaders() })
      if (res.ok) {
        setCurrentUser(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch current user')
    }
  }

  const fetchDistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/distributors`, { headers: getAuthHeaders() })
      if (res.ok) {
        setDistributors(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch distributors')
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (distributorDropdownRef.current && !distributorDropdownRef.current.contains(event.target)) {
        setShowDistributorDropdown(false)
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredDistributors = distributors.filter(d => 
    (typeof d.companyName === 'string' && d.companyName.toLowerCase().includes(searchDistributor.toLowerCase())) ||
    (d.gstIn && typeof d.gstIn === 'string' && d.gstIn.toLowerCase().includes(searchDistributor.toLowerCase()))
  )

  const filteredProducts = products.filter(p => 
    (typeof p.name === 'string' && p.name.toLowerCase().includes(searchProduct.toLowerCase())) ||
    (typeof p.sku === 'string' && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  )

  const selectDistributor = (distributor) => {
    setSelectedDistributor(distributor)
    setSearchDistributor(typeof distributor.companyName === 'string' ? distributor.companyName : '')
    setShowDistributorDropdown(false)
    setItems([])
  }

  const addProduct = (product) => {
    const newItem = {
      id: Date.now(),
      productId: product.id,
      productName: typeof product.name === 'string' ? product.name : 'Unnamed Product',
      sku: typeof product.sku === 'string' ? product.sku : '-',
      batchNo: typeof product.batchNo === 'string' ? product.batchNo : '',
      qty: 1,
      rate: parseFloat(product.baseSellingPrice) || 0,
      gstPercentage: parseFloat(product.gstPercentage) || 0,
      extraMarginPercentage: 0
    }
    setItems([...items, newItem])
    setSearchProduct('')
    setShowProductDropdown(false)
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const getGstType = () => {
    if (!currentUser?.gstin || typeof currentUser.gstin !== 'string') return 'cgst_sgst'
    const userState = currentUser.gstin.substring(0, 2)
    return userState === DISTRIBUTOR_STATE_CODE ? 'cgst_sgst' : 'igst'
  }

  const calculateItemTotals = (item) => {
    const rate = parseFloat(item.rate) || 0
    const extraMarginPercentage = parseFloat(item.extraMarginPercentage) || 0
    const gstPercentage = parseFloat(item.gstPercentage) || 0
    const qty = parseInt(item.qty) || 0
    
    const rateWithMargin = rate * (1 + (extraMarginPercentage / 100))
    const taxable = qty * rateWithMargin
    const gstAmount = (taxable * gstPercentage) / 100
    const cgst = gstAmount / 2
    const sgst = gstAmount / 2
    const total = taxable + cgst + sgst
    return { rateWithMargin, taxable, cgst, sgst, total }
  }

  const getGrandTotals = () => {
    let totalTaxable = 0
    let totalCGST = 0
    let totalSGST = 0
    let grandTotal = 0
    
    items.forEach(item => {
      const totals = calculateItemTotals(item)
      totalTaxable += parseFloat(totals.taxable) || 0
      totalCGST += parseFloat(totals.cgst) || 0
      totalSGST += parseFloat(totals.sgst) || 0
      grandTotal += parseFloat(totals.total) || 0
    })
    
    return { totalTaxable, totalCGST, totalSGST, grandTotal }
  }

  const handleSave = async (shouldPrint = false) => {
    if (!selectedDistributor) {
      setError('Please select a distributor first')
      return
    }
    if (items.length === 0) {
      setError('Please add at least one item')
      return
    }
    try {
      setLoading(true)
      setError('')
      const isInterState = getGstType() === 'igst'
      const invoiceItems = items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        qty: item.qty,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        extraMarginPercentage: item.extraMarginPercentage
      }))
      
      const res = await fetch(`${API_URL}/csa/distributors/${selectedDistributor.distributorId}/invoices/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ items: invoiceItems, isInterState })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedInvoice(data)
      if (shouldPrint) {
        setTimeout(() => window.print(), 100)
      }
      setTimeout(() => {
        handleNewInvoice()
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewInvoice = () => {
    setSelectedDistributor(null)
    setSearchDistributor('')
    setItems([])
    setProducts([])
    setSavedInvoice(null)
    setError('')
  }

  const totals = getGrandTotals()

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Create Invoice
          </h1>
        </div>
        <div className="flex gap-3">
          {(savedInvoice) && (
            <button
              onClick={handleNewInvoice}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              + New Invoice
            </button>
          )}
          {savedInvoice && (
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              🖨️ Print
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div ref={printRef}>
        {/* CSA Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Your Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
              <p className="font-medium text-gray-800">{typeof currentUser?.name === 'string' ? currentUser.name : '-'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">GSTIN</label>
              <p className="font-medium text-gray-800">{(typeof currentUser?.gstin === 'string' && currentUser.gstin) ? currentUser.gstin : '-'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
              <p className="font-medium text-gray-800">{(typeof currentUser?.phone === 'string' && currentUser.phone) ? currentUser.phone : '-'}</p>
            </div>
          </div>
        </div>
        
        {/* Distributor Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Select Distributor</h2>
          <div className="relative" ref={distributorDropdownRef}>
            <input
              type="text"
              placeholder="Search distributor by company name or GSTIN..."
              value={searchDistributor}
              onChange={(e) => { setSearchDistributor(e.target.value); setShowDistributorDropdown(true); setSelectedDistributor(null) }}
              onFocus={() => setShowDistributorDropdown(true)}
              disabled={savedInvoice !== null}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50"
            />
            {showDistributorDropdown && !savedInvoice && filteredDistributors.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredDistributors.map(d => (
                  <div
                    key={d.distributorId}
                    onClick={() => selectDistributor(d)}
                    className="px-4 py-3 hover:bg-pink-50 cursor-pointer transition"
                  >
                    <div className="font-medium text-gray-800">{typeof d.companyName === 'string' ? d.companyName : 'Unnamed'}</div>
                    <div className="text-sm text-gray-500">{(typeof d.gstIn === 'string' && d.gstIn) ? d.gstIn : 'No GSTIN'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDistributor && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Company Name</label>
                <p className="font-medium text-gray-800">{typeof selectedDistributor.companyName === 'string' ? selectedDistributor.companyName : '-'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">GSTIN</label>
                <p className="font-medium text-gray-800">{(typeof selectedDistributor.gstIn === 'string' && selectedDistributor.gstIn) ? selectedDistributor.gstIn : '-'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                <p className="font-medium text-gray-800">{(typeof selectedDistributor.phone === 'string' && selectedDistributor.phone) ? selectedDistributor.phone : '-'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Product Search */}
        {!savedInvoice && selectedDistributor && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Add Product</h2>
            <div className="relative" ref={productDropdownRef}>
              <input
                type="text"
                placeholder="Search product by name or SKU..."
                value={searchProduct}
                onChange={(e) => { setSearchProduct(e.target.value); setShowProductDropdown(true) }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="px-4 py-3 hover:bg-pink-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition"
                    >
                      <div>
                        <div className="font-medium text-gray-800">{typeof p.name === 'string' ? p.name : 'Unnamed Product'}</div>
                        <div className="text-sm text-gray-500">SKU: {typeof p.sku === 'string' ? p.sku : '-'} | Stock: {p.currentStock}</div>
                      </div>
                      <div className="text-pink-600 font-semibold">₹{p.baseSellingPrice}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Invoice Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Margin %</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Taxable</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST %</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  {!savedInvoice && (
                    <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={savedInvoice ? 8 : 9} className="px-4 md:px-6 py-10 text-center text-gray-500">
                      No items added yet
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const itemTotals = calculateItemTotals(item)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-4">
                          <div className="font-medium text-gray-800">{typeof item.productName === 'string' ? item.productName : '-'}</div>
                          <div className="text-xs text-gray-500">{typeof item.sku === 'string' ? item.sku : '-'}</div>
                        </td>
                        <td className="px-3 md:px-6 py-4 text-gray-600">{(typeof item.batchNo === 'string' && item.batchNo) ? item.batchNo : '-'}</td>
                        <td className="px-3 md:px-6 py-4">
                          {savedInvoice ? (
                            <span className="font-medium">{item.qty}</span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                              className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded-lg"
                            />
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          {savedInvoice ? (
                            <span className="font-medium">₹{(parseFloat(item.rate) || 0).toFixed(2)}</span>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-20 md:w-24 px-2 py-1 border border-gray-300 rounded-lg"
                            />
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          {savedInvoice ? (
                            <span className="font-medium">{item.extraMarginPercentage}%</span>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.extraMarginPercentage}
                              onChange={(e) => updateItem(item.id, 'extraMarginPercentage', parseFloat(e.target.value) || 0)}
                              className="w-20 md:w-24 px-2 py-1 border border-gray-300 rounded-lg"
                            />
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-gray-700">₹{(parseFloat(itemTotals.taxable) || 0).toFixed(2)}</td>
                        <td className="px-3 md:px-6 py-4 text-gray-700">{(parseFloat(item.gstPercentage) || 0)}%</td>
                        <td className="px-3 md:px-6 py-4 font-medium text-gray-900">₹{(parseFloat(itemTotals.total) || 0).toFixed(2)}</td>
                        {!savedInvoice && (
                          <td className="px-3 md:px-6 py-4 text-right">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {items.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 p-4 md:p-6">
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-gray-600 text-sm md:text-base">Taxable Value:</span>
                  <span className="font-medium text-gray-800">₹{(parseFloat(totals.totalTaxable) || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-gray-600 text-sm md:text-base">CGST:</span>
                  <span className="font-medium text-gray-800">₹{(parseFloat(totals.totalCGST) || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-gray-600 text-sm md:text-base">SGST:</span>
                  <span className="font-medium text-gray-800">₹{(parseFloat(totals.totalSGST) || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex items-center gap-4 md:gap-8">
                  <span className="text-base md:text-lg font-semibold text-gray-800">Grand Total:</span>
                  <span className="text-lg md:text-xl font-bold text-green-600">₹{(parseFloat(totals.grandTotal) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!savedInvoice && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition"
            >
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition"
            >
              {loading ? 'Saving...' : 'Save & Print'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CSAMyBilling