import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL
const PURCHASE_API_URL = `${API_URL}/purchase`
const DISTRIBUTOR_STATE_CODE = '27'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function PurchaseReturns() {
  const [products, setProducts] = useState([])
  const [purchaseReturns, setPurchaseReturns] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [supplierName, setSupplierName] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [searchProduct, setSearchProduct] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [items, setItems] = useState([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedReturn, setSavedReturn] = useState(null)
  const [showList, setShowList] = useState(false)
  
  const supplierDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)

  useEffect(() => {
    fetchProducts()
    fetchPurchaseReturns()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierDropdown(false)
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

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`, { headers: getAuthHeaders() })
      setProducts(await res.json())
    } catch (err) {
      console.error('Failed to fetch products')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${PURCHASE_API_URL}/suppliers`, { headers: getAuthHeaders() })
      setSuppliers(await res.json())
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

  const fetchPurchaseReturns = async () => {
    try {
      const res = await fetch(`${API_URL}/purchase-returns`, { headers: getAuthHeaders() })
      setPurchaseReturns(await res.json())
    } catch (err) {
      console.error('Failed to fetch purchase returns')
    }
  }

  const filteredProducts = products.filter(p => 
    (typeof p.name === 'string' && p.name.toLowerCase().includes(searchProduct.toLowerCase())) ||
    (typeof p.sku === 'string' && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  )

  const addProduct = (product) => {
    const newItem = {
      id: Date.now(),
      productId: product.id,
      productName: typeof product.name === 'string' ? product.name : 'Unnamed Product',
      sku: typeof product.sku === 'string' ? product.sku : '-',
      qty: 1,
      costPrice: parseFloat(product.costPrice) || 0,
      gstPercentage: parseFloat(product.gstPercentage) || 0
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

  const calculateItemTotals = (item) => {
    const costPrice = parseFloat(item.costPrice) || 0
    const qty = parseInt(item.qty) || 0
    const gstPercentage = parseFloat(item.gstPercentage) || 0
    const taxable = qty * costPrice
    const gstAmount = (taxable * gstPercentage) / 100
    // For purchase return, we'll assume same state unless specified
    const isInterState = false
    const cgst = !isInterState ? gstAmount / 2 : 0
    const sgst = !isInterState ? gstAmount / 2 : 0
    const igst = isInterState ? gstAmount : 0
    const total = taxable + cgst + sgst + igst
    return { taxable, cgst, sgst, igst, total }
  }

  const getGrandTotals = () => {
    let totalTaxable = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    let grandTotal = 0
    
    items.forEach(item => {
      const totals = calculateItemTotals(item)
      totalTaxable += parseFloat(totals.taxable) || 0
      totalCGST += parseFloat(totals.cgst) || 0
      totalSGST += parseFloat(totals.sgst) || 0
      totalIGST += parseFloat(totals.igst) || 0
      grandTotal += parseFloat(totals.total) || 0
    })
    
    return { totalTaxable, totalCGST, totalSGST, totalIGST, grandTotal }
  }

  const handleSave = async () => {
    if (!supplierName) {
      setError('Please enter supplier name')
      return
    }
    if (items.length === 0) {
      setError('Please add at least one item')
      return
    }
    try {
      setLoading(true)
      setError('')
      const isInterState = false
      const returnItems = items.map(item => ({
        productId: item.productId,
        qty: item.qty,
        costPrice: item.costPrice,
        gstPercentage: item.gstPercentage
      }))
      const res = await fetch(`${API_URL}/purchase-returns/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ supplierName, items: returnItems, reason, isInterState })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedReturn(data)
      await fetchPurchaseReturns()
      // Auto reset form after successful save
      setTimeout(() => {
        handleNewReturn()
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewReturn = () => {
    setSupplierName('')
    setItems([])
    setReason('')
    setSavedReturn(null)
    setError('')
    setShowList(false)
  }

  const totals = getGrandTotals()

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Purchase Return</h1>
        <div className="flex gap-3">
          {savedReturn && (
            <button
              onClick={handleNewReturn}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              + New Return
            </button>
          )}
          <button
            onClick={() => setShowList(!showList)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
          >
            {showList ? 'New Return' : 'View All Returns'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showList ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Purchase Returns History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Return No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseReturns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No purchase returns yet
                    </td>
                  </tr>
                ) : (
                  purchaseReturns.map(pr => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{pr.returnNo}</td>
                      <td className="px-4 py-3 text-gray-600">{pr.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(pr.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">{pr.reason || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">₹{parseFloat(pr.grandTotal).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Supplier Details</h2>
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
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Return Reason (Optional)</label>
              <input
                type="text"
                placeholder="Enter reason for return"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {!savedReturn && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Add Product</h2>
              <div className="relative" ref={productDropdownRef}>
                <input
                  type="text"
                  placeholder="Search product by name or SKU..."
                  value={searchProduct}
                  onChange={(e) => { setSearchProduct(e.target.value); setShowProductDropdown(true) }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-medium text-gray-800">{typeof p.name === 'string' ? p.name : 'Unnamed Product'}</div>
                          <div className="text-sm text-gray-500">SKU: {typeof p.sku === 'string' ? p.sku : '-'} | Stock: {p.currentStock}</div>
                        </div>
                        <div className="text-blue-600 font-semibold">₹{p.costPrice}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Return Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost Price</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Taxable</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST%</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    {!savedReturn && (
                      <th className="px-3 md:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={savedReturn ? 6 : 7} className="px-4 md:px-6 py-10 text-center text-gray-500">
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const itemTotals = calculateItemTotals(item)
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-3">
                            <div className="font-medium text-gray-800">{typeof item.productName === 'string' ? item.productName : '-'}</div>
                            <div className="text-xs text-gray-500">{typeof item.sku === 'string' ? item.sku : '-'}</div>
                          </td>
                          <td className="px-3 md:px-4 py-3">
                            {savedReturn ? (
                              <span className="font-medium">{item.qty}</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                                className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-3">
                            {savedReturn ? (
                              <span className="font-medium">₹{(parseFloat(item.costPrice) || 0).toFixed(2)}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                value={item.costPrice}
                                onChange={(e) => updateItem(item.id, 'costPrice', parseFloat(e.target.value) || 0)}
                                className="w-20 md:w-24 px-2 py-1 border border-gray-300 rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-3 text-gray-600">₹{(parseFloat(itemTotals.taxable) || 0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-3 text-gray-600">{(parseFloat(item.gstPercentage) || 0)}%</td>
                          <td className="px-3 md:px-4 py-3 font-medium text-gray-900">₹{(parseFloat(itemTotals.total) || 0).toFixed(2)}</td>
                          {!savedReturn && (
                            <td className="px-3 md:px-4 py-3 text-right">
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
                  <>
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className="text-gray-600 text-sm md:text-base">CGST:</span>
                      <span className="font-medium text-gray-800">₹{(parseFloat(totals.totalCGST) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className="text-gray-600 text-sm md:text-base">SGST:</span>
                      <span className="font-medium text-gray-800">₹{(parseFloat(totals.totalSGST) || 0).toFixed(2)}</span>
                    </div>
                  </>
                  <div className="border-t border-gray-300 pt-2 flex items-center gap-4 md:gap-8">
                    <span className="text-base md:text-lg font-semibold text-gray-800">Grand Total:</span>
                    <span className="text-lg md:text-xl font-bold text-red-600">₹{(parseFloat(totals.grandTotal) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!savedReturn && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-lg font-medium transition"
              >
                {loading ? 'Saving...' : 'Save Return'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PurchaseReturns
