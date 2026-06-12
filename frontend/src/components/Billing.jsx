import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL
const DISTRIBUTOR_STATE_CODE = '27' // Maharashtra as default

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function Billing() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editInvoiceId = searchParams.get('edit')
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const isCSA = user?.role === 'CSA' 
  
  const [parties, setParties] = useState([])
  const [products, setProducts] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [searchParty, setSearchParty] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showPartyDropdown, setShowPartyDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingInvoice, setFetchingInvoice] = useState(false)
  const [error, setError] = useState('')
  const [savedInvoice, setSavedInvoice] = useState(null)
  const [distributor, setDistributor] = useState(null)
  const [distributors, setDistributors] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const printRef = useRef(null)
  const partyDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)
  const distributorDropdownRef = useRef(null)

  // Fetch all CSA's distributors on load
  useEffect(() => {
    if (isCSA) {
      fetchAllCSADistributors().then(() => {
        // If there's a saved distributor ID, select it
        const savedDistId = localStorage.getItem('csaDistributorId')
        if (savedDistId) {
          // We need to wait for fetchAllCSADistributors to complete so that distributors state is set
          // Let's check if distributors are available after a short delay
          setTimeout(() => {
            const foundDist = distributors.find(d => (d.distributorId || d.id) === savedDistId)
            if (foundDist) {
              selectDistributor(foundDist)
            }
          }, 100)
        }
      })
    } else {
      fetchParties()
      fetchProducts()
    }
  }, [])

  const fetchAllCSADistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/distributors`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setDistributors(data || [])
        // If csaDistributorId is in localStorage, pre-select it
        const savedId = localStorage.getItem('csaDistributorId')
        if (savedId) {
          const found = data.find(d => d.distributorId === savedId || d.id === savedId)
          if (found) {
            selectDistributor(found)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch CSA distributors')
    }
  }

  const fetchAllProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`, { headers: getAuthHeaders() })
      if (res.ok) {
        setProducts(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch all products')
    }
  }

  const selectDistributor = async (dist) => {
    const distId = dist.distributorId || dist.id
    setSelectedDistributor(dist)
    localStorage.setItem('csaDistributorId', distId)
    setShowDistributorDropdown(false)
    // Now fetch distributor details, parties, and products for this distributor
    try {
      const res = await fetch(`${API_URL}/csa/distributors/${distId}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setDistributor(data)
        setParties(data.parties || [])
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch distributor data')
    }
    // Reset form
    setSelectedParty(null)
    setSearchParty('')
    setItems([])
  }

  useEffect(() => {
    if (editInvoiceId) {
      fetchInvoiceForEdit(editInvoiceId)
    }
  }, [editInvoiceId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target)) {
        setShowPartyDropdown(false)
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false)
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

  const fetchParties = async () => {
    try {
      const res = await fetch(`${API_URL}/parties`, { headers: getAuthHeaders() })
      setParties(await res.json())
    } catch (err) {
      console.error('Failed to fetch parties')
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`, { headers: getAuthHeaders() })
      setProducts(await res.json())
    } catch (err) {
      console.error('Failed to fetch products')
    }
  }

  const fetchInvoiceForEdit = async (id) => {
    try {
      setFetchingInvoice(true)
      const currentDistId = selectedDistributor?.distributorId || selectedDistributor?.id || localStorage.getItem('csaDistributorId')
      const url = isCSA 
        ? `${API_URL}/csa/distributors/${currentDistId}/invoices/${id}` 
        : `${API_URL}/invoices/${id}`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load invoice')
        return
      }
      const invoice = await res.json()
      
      setSelectedParty(invoice.party)
      setSearchParty(invoice.party?.name || '')
      
      const invoiceItems = invoice.invoiceItems.map((item, idx) => ({
        id: idx,
        productId: item.productId,
        productName: item.product?.name || 'Unknown',
        sku: item.product?.sku || '-',
        batchNo: item.product?.batchNo || '',
        qty: item.qty,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        extraMarginPercentage: item.extraMarginPercentage || 0
      }))
      setItems(invoiceItems)
    } catch (err) {
      setError('Failed to load invoice')
    } finally {
      setFetchingInvoice(false)
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
    if (!selectedParty?.gstin || typeof selectedParty.gstin !== 'string') return 'cgst_sgst'
    const partyState = selectedParty.gstin.substring(0, 2)
    return partyState === DISTRIBUTOR_STATE_CODE ? 'cgst_sgst' : 'igst'
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
    if (isCSA && !selectedDistributor) {
      setError('Please select a distributor first!')
      return
    }
    if (!isCSA && !selectedParty) {
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
      // For CSA, we don't use party, so default to cgst_sgst
      const isInterState = isCSA ? false : getGstType() === 'igst'
      const invoiceItems = items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        qty: item.qty,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        extraMarginPercentage: item.extraMarginPercentage
      }))
      
      const currentDistId = selectedDistributor?.distributorId || selectedDistributor?.id || localStorage.getItem('csaDistributorId')
      
      const url = isCSA 
        ? `${API_URL}/csa/distributors/${currentDistId}/invoices/create` 
        : (editInvoiceId 
            ? `${API_URL}/invoices/${editInvoiceId}`
            : `${API_URL}/invoices/create`)
      
      const method = isCSA ? 'POST' : (editInvoiceId ? 'PUT' : 'POST')
      
      const requestBody = isCSA 
        ? { items: invoiceItems, isInterState }
        : { partyId: selectedParty.id, items: invoiceItems, isInterState }
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(requestBody)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedInvoice(data)
      if (shouldPrint) {
        setTimeout(() => window.print(), 100)
      }
      // Auto reset form after successful save for new invoices, and navigate back for CSA
      if (!editInvoiceId) {
        setTimeout(() => {
          handleNewInvoice()
        }, 1500)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewInvoice = () => {
    setSelectedParty(null)
    setSearchParty('')
    setItems([])
    setSavedInvoice(null)
    setError('')
    if (isCSA) {
      const currentDistId = selectedDistributor?.distributorId || selectedDistributor?.id || localStorage.getItem('csaDistributorId')
      navigate(`/csa/distributor/${currentDistId}`)
    } else {
      navigate('/billing')
    }
  }

  const totals = getGrandTotals()

  if (fetchingInvoice) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading invoice...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {isCSA && (
            <button
              onClick={() => {
                const currentDistId = selectedDistributor?.distributorId || selectedDistributor?.id || localStorage.getItem('csaDistributorId')
                navigate(`/csa/distributor/${currentDistId}`)
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              {isCSA 
                ? (editInvoiceId ? 'Edit Invoice' : 'Create Invoice') 
                : (editInvoiceId ? 'Edit Invoice' : 'Customer Billing')}
            </h1>
            {isCSA && distributor && (
              <p className="text-pink-600 font-semibold mt-1">
                Distributor: {distributor.companyName}
              </p>
            )}
            {editInvoiceId && (
              <p className="text-gray-500 mt-1">Editing invoice #{editInvoiceId}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {(savedInvoice || editInvoiceId) && (
            <button
              onClick={handleNewInvoice}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              {editInvoiceId ? '+ New Invoice' : '+ New Invoice'}
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

      {/* Distributor Selection for CSA */}
      {isCSA && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Select Distributor</h2>
          <div className="relative" ref={distributorDropdownRef}>
            <div
              onClick={() => setShowDistributorDropdown(!showDistributorDropdown)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer flex items-center justify-between"
            >
              <span className={selectedDistributor ? "text-gray-900" : "text-gray-500"}>
                {selectedDistributor?.companyName || "Select a distributor"}
              </span>
              <span className="text-gray-500">▼</span>
            </div>
            {showDistributorDropdown && distributors.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {distributors.map(d => (
                  <div
                    key={d.distributorId || d.id}
                    onClick={() => selectDistributor(d)}
                    className={`px-4 py-3 cursor-pointer transition ${selectedDistributor?.distributorId === d.distributorId || selectedDistributor?.id === d.id ? "bg-pink-50 text-pink-700" : "hover:bg-gray-50"}`}
                  >
                    <div className="font-medium text-gray-800">{d.companyName}</div>
                    <div className="text-sm text-gray-500">{d.ownerName} • {d.city}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={printRef}>
        {/* Customer Info - only for non-CSA */}
        {!isCSA && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>
            <div className="relative" ref={partyDropdownRef}>
              <input
                type="text"
                placeholder="Search customer by name or GSTIN..."
                value={searchParty}
                onChange={(e) => { setSearchParty(e.target.value); setShowPartyDropdown(true); setSelectedParty(null) }}
                onFocus={() => setShowPartyDropdown(true)}
                disabled={savedInvoice !== null || editInvoiceId}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-50"
              />
              {showPartyDropdown && !editInvoiceId && filteredParties.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredParties.map(p => (
                    <div
                      key={p.id}
                      onClick={() => selectParty(p)}
                      className="px-4 py-3 hover:bg-pink-50 cursor-pointer transition"
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
          </div>
        )}

        {/* Product Search */}
        {!savedInvoice && !editInvoiceId && (
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
            {editInvoiceId && (
              <p className="text-sm text-gray-500 mt-1">Only quantity is editable in edit mode</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Margin (%)</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Taxable</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST%</th>
                  <th className="px-3 md:px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  {!savedInvoice && !editInvoiceId && (
                    <th className="px-3 md:px-4 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={savedInvoice || editInvoiceId ? 8 : 9} className="px-6 py-12 text-center text-gray-500">
                      No items added yet
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const itemTotals = calculateItemTotals(item)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-4 py-4">
                          <div className="font-medium text-gray-900">{typeof item.productName === 'string' ? item.productName : '-'}</div>
                          <div className="text-xs text-gray-500">{typeof item.sku === 'string' ? item.sku : '-'}</div>
                        </td>
                        <td className="px-3 md:px-4 py-4 text-gray-700">{(typeof item.batchNo === 'string' && item.batchNo) ? item.batchNo : '-'}</td>
                        <td className="px-3 md:px-4 py-4">
                          {savedInvoice ? (
                            <span className="font-semibold">{item.qty}</span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                              className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          )}
                        </td>
                        <td className="px-3 md:px-4 py-4">
                          {savedInvoice || editInvoiceId ? (
                            <span className="font-semibold">₹{(parseFloat(itemTotals.rateWithMargin) || 0).toFixed(2)}</span>
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
                        <td className="px-3 md:px-4 py-4">
                          {savedInvoice || editInvoiceId ? (
                            <span>{(parseFloat(item.extraMarginPercentage) || 0)}%</span>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              value={item.extraMarginPercentage}
                              onChange={(e) => updateItem(item.id, 'extraMarginPercentage', parseFloat(e.target.value) || 0)}
                              className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded-lg"
                            />
                          )}
                        </td>
                        <td className="px-3 md:px-4 py-4 text-gray-700">₹{(parseFloat(itemTotals.taxable) || 0).toFixed(2)}</td>
                        <td className="px-3 md:px-4 py-4 text-gray-700">{(parseFloat(item.gstPercentage) || 0)}%</td>
                        <td className="px-3 md:px-4 py-4 font-semibold text-gray-900">₹{(parseFloat(itemTotals.total) || 0).toFixed(2)}</td>
                        {!savedInvoice && !editInvoiceId && (
                          <td className="px-3 md:px-4 py-4 text-right">
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

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 p-4 md:p-6">
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-gray-600 text-sm md:text-base">Taxable Value:</span>
                  <span className="font-medium text-gray-900">₹{(parseFloat(totals.totalTaxable) || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-gray-600 text-sm md:text-base">CGST:</span>
                  <span className="font-medium text-gray-900">₹{(parseFloat(totals.totalCGST) || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-gray-600 text-sm md:text-base">SGST:</span>
                  <span className="font-medium text-gray-900">₹{(parseFloat(totals.totalSGST) || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex items-center gap-4 md:gap-8">
                  <span className="text-base md:text-lg font-semibold text-gray-900">Grand Total:</span>
                  <span className="text-lg md:text-xl font-bold text-pink-600">₹{(parseFloat(totals.grandTotal) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!savedInvoice && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition"
            >
              {loading ? 'Saving...' : (editInvoiceId ? 'Update Invoice' : 'Save Invoice')}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition"
            >
              {loading ? 'Saving...' : (editInvoiceId ? 'Update & Print' : 'Save & Print')}
            </button>
          </div>
        )}
      </div>

      {/* Print Styles */}
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

export default Billing
