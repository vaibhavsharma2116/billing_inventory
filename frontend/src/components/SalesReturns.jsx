import { useState, useEffect, useRef } from 'react'
import { Download, Eye, X } from 'lucide-react'
import { downloadReturnPDF } from '../utils/returnPdfGenerator'

const API_URL = import.meta.env.VITE_API_URL
const DISTRIBUTOR_STATE_CODE = '27'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function SalesReturns() {
  const [parties, setParties] = useState([])
  const [products, setProducts] = useState([])
  const [salesReturns, setSalesReturns] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [searchParty, setSearchParty] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showPartyDropdown, setShowPartyDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [items, setItems] = useState([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedReturn, setSavedReturn] = useState(null)
  const [showList, setShowList] = useState(false)
  const [viewReturn, setViewReturn] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const printRef = useRef(null)
  const partyDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)

  useEffect(() => {
    fetchParties()
    fetchProducts()
    fetchSalesReturns()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target)) {
        setShowPartyDropdown(false)
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

  async function fetchParties() {
    try {
      const res = await fetch(`${API_URL}/parties`, { headers: getAuthHeaders() })
      setParties(await res.json())
    } catch (err) {
      console.error('Failed to fetch parties')
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${API_URL}/products`, { headers: getAuthHeaders() })
      setProducts(await res.json())
    } catch (err) {
      console.error('Failed to fetch products')
    }
  }

  async function fetchSalesReturns() {
    try {
      const res = await fetch(`${API_URL}/sales-returns`, { headers: getAuthHeaders() })
      setSalesReturns(await res.json())
    } catch (err) {
      console.error('Failed to fetch sales returns')
    }
  }

  const filteredParties = parties.filter(p => 
    (typeof p.name === 'string' && p.name.toLowerCase().includes(searchParty.toLowerCase())) ||
    (p.gstin && typeof p.gstin === 'string' && p.gstin.toLowerCase().includes(searchParty.toLowerCase()))
  )

  const filteredProducts = products.filter(p => 
    (typeof p.name === 'string' && p.name.toLowerCase().includes(searchProduct.toLowerCase())) ||
    (typeof p.sku === 'string' && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  )

  const selectParty = (party) => {
    setSelectedParty(party)
    setSearchParty(typeof party.name === 'string' ? party.name : '')
    setShowPartyDropdown(false)
  }

  const addProduct = (product) => {
    if (product.currentStock <= 0) {
      alert("This product is out of stock (Stock: 0) and cannot be added.");
      return;
    }

    const partyMargin = selectedParty ? (parseFloat(selectedParty.margin) || 0) : 0;
    const mrp = parseFloat(product.baseSellingPrice) || 0;
    const calculatedRate = mrp - (mrp * partyMargin / 100);

    const newItem = {
      id: Date.now(),
      productId: product.id,
      productName: typeof product.name === 'string' ? product.name : 'Unnamed Product',
      sku: typeof product.sku === 'string' ? product.sku : '-',
      hsn: typeof product.hsn === 'string' ? product.hsn : '-',
      batchNo: typeof product.batchNo === 'string' ? product.batchNo : '',
      qty: 1,
      mrp: mrp,
      extraMarginPercentage: partyMargin,
      rate: calculatedRate,
      costPrice: parseFloat(product.costPrice) || 0,
      gstPercentage: parseFloat(product.gstPercentage) || 0
    }
    setItems([...items, newItem])
    setSearchProduct('')
    setShowProductDropdown(false)
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value }
        
        if (field === 'extraMarginPercentage') {
           const margin = parseFloat(value) || 0;
           updatedItem.rate = item.mrp - (item.mrp * margin / 100);
        }
        
        return updatedItem;
      }
      return item;
    }))
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const getGstType = () => {
    if (!selectedParty?.gstin || typeof selectedParty.gstin !== 'string') return 'cgst_sgst'
    const partyState = selectedParty.gstin.substring(0, 2)
    return partyState === DISTRIBUTOR_STATE_CODE ? 'cgst_sgst' : 'igst'
  }

  const calculateItemTotals = (item) => {
    const rate = parseFloat(item.rate) || 0
    const qty = parseInt(item.qty) || 0
    const gstPercentage = parseFloat(item.gstPercentage) || 0
    const total = rate * qty
    const taxable = total / (1 + (gstPercentage / 100))
    const gstAmount = total - taxable
    const gstType = getGstType()
    const cgst = gstType === 'cgst_sgst' ? gstAmount / 2 : 0
    const sgst = gstType === 'cgst_sgst' ? gstAmount / 2 : 0
    const igst = gstType === 'igst' ? gstAmount : 0
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

  const handleSave = async (shouldPrint = false) => {
    if (!selectedParty) {
      setError('Please select a customer first')
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
      const returnItems = items.map(item => ({
        productId: item.productId,
        qty: item.qty,
        rate: item.rate,
        mrp: item.mrp,
        extraMarginPercentage: item.extraMarginPercentage,
        costPrice: item.costPrice,
        gstPercentage: item.gstPercentage
      }))
      const res = await fetch(`${API_URL}/sales-returns/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ partyId: selectedParty.id, items: returnItems, reason, isInterState })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedReturn(data)
      await fetchSalesReturns()
      if (shouldPrint) {
        setTimeout(() => window.print(), 100)
      }
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
    setSelectedParty(null)
    setSearchParty('')
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sales Return</h1>
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
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Sales Returns History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Return No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      No sales returns yet
                    </td>
                  </tr>
                ) : (
                  salesReturns.map((sr, idx) => (
                    <tr key={sr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{sr.returnNo}</td>
                      <td className="px-4 py-3 text-gray-700">{sr.party?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(sr.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">{sr.reason || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{parseFloat(sr.grandTotal).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                        <button onClick={() => { setViewReturn(sr); setShowViewModal(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button onClick={() => downloadReturnPDF(sr, 'Sales Return')} className="text-green-600 hover:text-green-800" title="Download PDF">
                          <Download className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div ref={printRef}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>
            <div className="relative mb-4" ref={partyDropdownRef}>
              <input
                type="text"
                placeholder="Search customer by name or GSTIN..."
                value={searchParty}
                onChange={(e) => { setSearchParty(e.target.value); setShowPartyDropdown(true); setSelectedParty(null) }}
                onFocus={() => setShowPartyDropdown(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showPartyDropdown && filteredParties.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredParties.map(p => (
                    <div
                      key={p.id}
                      onClick={() => selectParty(p)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-800">{typeof p.name === 'string' ? p.name : 'Unnamed'}</div>
                      <div className="text-sm text-gray-500">{(typeof p.gstin === 'string' && p.gstin) ? p.gstin : 'No GSTIN'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedParty && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <p className="font-medium text-gray-800">{typeof selectedParty.name === 'string' ? selectedParty.name : '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">GSTIN</label>
                  <p className="font-medium text-gray-800">{(typeof selectedParty.gstin === 'string' && selectedParty.gstin) ? selectedParty.gstin : '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                  <p className="font-medium text-gray-800">{(typeof selectedParty.phone === 'string' && selectedParty.phone) ? selectedParty.phone : '-'}</p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-500 uppercase">Return Reason</label>
              <input
                type="text"
                placeholder="Enter reason for return..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
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
                        <div className="text-blue-600 font-semibold">₹{p.baseSellingPrice}</div>
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
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">HSN</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MRP</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Margin %</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
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
                      <td colSpan={savedReturn ? 10 : 11} className="px-4 md:px-6 py-10 text-center text-gray-500">
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
                          <td className="px-3 md:px-4 py-3 text-gray-600">{(typeof item.hsn === 'string' && item.hsn) ? item.hsn : '-'}</td>
                          <td className="px-3 md:px-4 py-3 text-gray-600">{(typeof item.batchNo === 'string' && item.batchNo) ? item.batchNo : '-'}</td>
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
                          <td className="px-3 md:px-4 py-3 font-medium text-gray-700">₹{(parseFloat(item.mrp) || 0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-3">
                            {savedReturn ? (
                              <span className="font-medium">{(parseFloat(item.extraMarginPercentage) || 0)}%</span>
                            ) : (
                              <input
                                type="number"
                                step="0.1"
                                value={item.extraMarginPercentage}
                                onChange={(e) => updateItem(item.id, 'extraMarginPercentage', parseFloat(e.target.value) || 0)}
                                className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-3">
                            {savedReturn ? (
                              <span className="font-medium">₹{(parseFloat(item.rate) || 0).toFixed(2)}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-20 md:w-24 px-2 py-1 border border-gray-300 rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-3 text-gray-700">₹{(parseFloat(itemTotals.taxable) || 0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-3 text-gray-700">{(parseFloat(item.gstPercentage) || 0)}%</td>
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
                  {getGstType() === 'cgst_sgst' ? (
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
                  ) : (
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className="text-gray-600 text-sm md:text-base">IGST:</span>
                      <span className="font-medium text-gray-800">₹{(parseFloat(totals.totalIGST) || 0).toFixed(2)}</span>
                    </div>
                  )}
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
                onClick={() => handleSave(false)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-lg font-medium transition"
              >
                {loading ? 'Saving...' : 'Save Return'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewReturn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Return Details: {viewReturn.returnNo}</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Return No</div>
                  <div className="font-medium text-gray-900">{viewReturn.returnNo}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Date</div>
                  <div className="font-medium text-gray-900">{new Date(viewReturn.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer</div>
                  <div className="font-medium text-gray-900">{viewReturn.party?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Reason</div>
                  <div className="font-medium text-gray-900">{viewReturn.reason || '-'}</div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">HSN No.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MRP</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Margin %</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Taxable</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST%</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewReturn.salesReturnItems && viewReturn.salesReturnItems.map((item, idx) => {
                        const rate = parseFloat(item.rate) || 0
                        const qty = item.qty || 0
                        const gstPercentage = parseFloat(item.product?.gstPercentage) || parseFloat(item.gstPercentage) || 0
                        const total = qty * rate
                        const taxable = total / (1 + (gstPercentage / 100))
                        const mrp = parseFloat(item.mrp || item.product?.baseSellingPrice) || 0
                        const margin = mrp > 0 ? ((mrp - rate) / mrp) * 100 : 0
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">{item.product?.name || '-'}</div>
                              <div className="text-xs text-gray-500">{item.product?.sku || '-'}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{item.product?.hsn || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{item.batchNo || '-'}</td>
                            <td className="px-4 py-3 font-medium">{qty}</td>
                            <td className="px-4 py-3 text-gray-700">₹{mrp.toFixed(2)}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{margin.toFixed(0)}%</td>
                            <td className="px-4 py-3 text-gray-700">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-700">₹{taxable.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-700">{gstPercentage}%</td>
                            <td className="px-4 py-3 font-medium text-gray-900">₹{total.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 border-t border-gray-200 p-4 md:p-6">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-4 md:gap-8">
                      <span className="text-gray-600 text-sm md:text-base">Taxable Value:</span>
                      <span className="font-medium text-gray-800">₹{(parseFloat(viewReturn.taxableValue) || 0).toFixed(2)}</span>
                    </div>
                      <>
                        <div className="flex items-center gap-4 md:gap-8">
                          <span className="text-gray-600 text-sm md:text-base">CGST:</span>
                          <span className="font-medium text-gray-800">₹{(parseFloat(viewReturn.cgst || 0) + parseFloat(viewReturn.igst || 0) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8">
                          <span className="text-gray-600 text-sm md:text-base">SGST:</span>
                          <span className="font-medium text-gray-800">₹{(parseFloat(viewReturn.sgst || 0) + parseFloat(viewReturn.igst || 0) / 2).toFixed(2)}</span>
                        </div>
                      </>
                    <div className="border-t border-gray-300 pt-2 flex items-center gap-4 md:gap-8">
                      <span className="text-base md:text-lg font-semibold text-gray-800">Grand Total:</span>
                      <span className="text-lg md:text-xl font-bold text-red-600">₹{(parseFloat(viewReturn.grandTotal) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          header, footer, nav, button, .no-print {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default SalesReturns
