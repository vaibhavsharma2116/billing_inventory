import { useState, useEffect } from 'react'

const BASE_API_URL = import.meta.env.VITE_API_URL
const API_URL = `${BASE_API_URL}/reports`

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function Reports() {
  const [activeTab, setActiveTab] = useState('party-sales')
  const [partySales, setPartySales] = useState([])
  const [productSales, setProductSales] = useState([])
  const [parties, setParties] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [partyProductSales, setPartyProductSales] = useState([])
  const [inventoryReport, setInventoryReport] = useState(null)
  const [partyLedger, setPartyLedger] = useState(null)
  const [ledgerStartDate, setLedgerStartDate] = useState('')
  const [ledgerEndDate, setLedgerEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const getDateRange = (filter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    switch (filter) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        }
      case 'this-week':
        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        }
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        }
      case 'this-year':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        return {
          start: yearStart.toISOString().split('T')[0],
          end: yearEnd.toISOString().split('T')[0]
        }
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        }
      default:
        return {
          start: null,
          end: null
        }
    }
  }

  useEffect(() => {
    fetchPartySales()
    fetchProductSales()
    fetchInventoryReport()
    if (selectedParty && activeTab === 'party-product') {
      fetchPartyProductSales(selectedParty.id)
    }
  }, [dateFilter, customStartDate, customEndDate])

  useEffect(() => {
    fetchParties()
  }, [])

  const fetchPartySales = async () => {
    try {
      const dateRange = getDateRange(dateFilter)
      let url = `${API_URL}/party-sales`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() })
      setPartySales(await res.json())
    } catch (err) {
      console.error('Failed to fetch party sales')
    }
  }

  const fetchProductSales = async () => {
    try {
      const dateRange = getDateRange(dateFilter)
      let url = `${API_URL}/product-sales`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() })
      setProductSales(await res.json())
    } catch (err) {
      console.error('Failed to fetch product sales')
    }
  }

  const fetchParties = async () => {
    try {
      const res = await fetch(`${BASE_API_URL}/parties`, { headers: getAuthHeaders() })
      setParties(await res.json())
    } catch (err) {
      console.error('Failed to fetch parties')
    }
  }

  const fetchInventoryReport = async () => {
    try {
      const dateRange = getDateRange(dateFilter)
      let url = `${API_URL}/inventory`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() })
      setInventoryReport(await res.json())
    } catch (err) {
      console.error('Failed to fetch inventory report')
    }
  }

  const fetchPartyProductSales = async (partyId) => {
    try {
      setLoading(true)
      const dateRange = getDateRange(dateFilter)
      let url = `${API_URL}/party-product-sales/${partyId}`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() })
      setPartyProductSales(await res.json())
    } catch (err) {
      console.error('Failed to fetch party product sales')
    } finally {
      setLoading(false)
    }
  }

  const fetchPartyLedger = async (partyId, startDate, endDate) => {
    try {
      setLoading(true)
      let url = `${API_URL}/party-ledger/${partyId}`
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (params.toString()) url += `?${params.toString()}`
      
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch ledger')
      setPartyLedger(await res.json())
    } catch (err) {
      console.error('Failed to fetch party ledger', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePartySelect = (party) => {
    setSelectedParty(party)
    if (activeTab === 'party-product') {
      if (party) {
        fetchPartyProductSales(party.id)
      } else {
        setPartyProductSales([])
      }
    } else if (activeTab === 'party-ledger') {
      if (party) {
        fetchPartyLedger(party.id, ledgerStartDate, ledgerEndDate)
      } else {
        setPartyLedger(null)
      }
    }
  }

  const handleLedgerRefresh = () => {
    if (selectedParty) {
      fetchPartyLedger(selectedParty.id, ledgerStartDate, ledgerEndDate)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Reports & Analytics</h1>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <label className="text-sm font-semibold text-gray-700">Filter by Date:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="this-year">This Year</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex flex-col md:flex-row gap-4 mt-4 items-start md:items-center">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <span className="text-gray-500 text-sm font-medium">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'party-sales', label: 'Party-wise Sales' },
            { id: 'product-sales', label: 'Product-wise Sales' },
            { id: 'party-product', label: 'Party-wise Product Sales' },
            { id: 'inventory', label: 'Inventory Valuation' },
            { id: 'party-ledger', label: 'Party Ledger' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'party-ledger' && selectedParty) {
                  fetchPartyLedger(selectedParty.id, ledgerStartDate, ledgerEndDate)
                }
              }}
              className={`px-4 py-3 text-xs md:text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Party-wise Sales */}
      {activeTab === 'party-sales' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Party-wise Sales Report</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GSTIN</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoices</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {partySales.map(party => (
                  <tr key={party.partyId} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{party.partyName}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{party.gstin || '-'}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{party.phone || '-'}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{party.invoiceCount}</td>
                    <td className="px-4 md:px-6 py-4 text-right font-semibold text-gray-900 text-sm md:text-base">₹{party.totalBilling.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product-wise Sales */}
      {activeTab === 'product-sales' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Product-wise Sales Report</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty Sold</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productSales.map(product => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{product.productName}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{product.sku}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{product.totalQtySold}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">₹{product.totalRevenue.toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">₹{product.totalCost.toFixed(2)}</td>
                    <td className={`px-4 md:px-6 py-4 text-right font-semibold text-sm md:text-base ${
                      parseFloat(product.profitMargin) > 20 ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {product.profitMargin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Party-wise Product Sales */}
      {activeTab === 'party-product' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Select Party</h2>
            <select
              value={selectedParty?.id || ''}
              onChange={(e) => handlePartySelect(parties.find(p => p.id === e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a Party --</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedParty && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base md:text-lg font-semibold text-gray-800">
                  Products Purchased by {selectedParty.name}
                </h2>
              </div>
              {loading ? (
                <div className="p-10 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : partyProductSales.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No products found for this party</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Qty</th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {partyProductSales.map(ps => {
                        let lastPurchaseDate = '-'
                        if (ps.orders && ps.orders.length > 0 && ps.orders[0].date) {
                          const date = new Date(ps.orders[0].date)
                          if (!isNaN(date.getTime())) {
                            lastPurchaseDate = date.toLocaleDateString()
                          }
                        }
                        return (
                          <tr key={ps.productId} className="hover:bg-gray-50">
                            <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{ps.productName}</td>
                            <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{ps.sku}</td>
                            <td className="px-4 md:px-6 py-4 text-gray-600 font-semibold text-sm md:text-base">{ps.totalQty}</td>
                            <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">
                              {lastPurchaseDate}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inventory Valuation */}
      {activeTab === 'inventory' && inventoryReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Total Inventory Value</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-600">₹{inventoryReport.totalValue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Products in Stock</div>
              <div className="text-2xl md:text-3xl font-bold text-green-600">{inventoryReport.inventory.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Report Period</div>
              <div className="text-base md:text-lg font-semibold text-gray-800">Last 30 days</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Inventory Valuation Report</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Opening Stock</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Purchases</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sales</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Closing Stock</th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventoryReport.inventory.map(item => (
                    <tr key={item.productId} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{item.productName}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{item.openingStock}</td>
                      <td className="px-4 md:px-6 py-4 text-green-600 text-sm md:text-base">+{item.purchases}</td>
                      <td className="px-4 md:px-6 py-4 text-red-600 text-sm md:text-base">-{item.sales}</td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-800 text-sm md:text-base">{item.closingStock}</td>
                      <td className="px-4 md:px-6 py-4 text-right font-semibold text-gray-900 text-sm md:text-base">₹{item.value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Party Ledger */}
      {activeTab === 'party-ledger' && (
        <div className="space-y-6">
          {/* Party Selection & Date Range */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Select Party</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select
                value={selectedParty?.id || ''}
                onChange={(e) => handlePartySelect(parties.find(p => p.id === e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a Party --</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={ledgerStartDate}
                onChange={(e) => setLedgerStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="End Date"
                />
                <button
                  onClick={handleLedgerRefresh}
                  disabled={!selectedParty || loading}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Display */}
          {selectedParty && (
            <>
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : partyLedger ? (
                <div className="space-y-6">
                  {/* Party Info */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{partyLedger.party.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div><span className="font-medium">GSTIN:</span> {partyLedger.party.gstin || '-'}</div>
                      <div><span className="font-medium">Phone:</span> {partyLedger.party.phone || '-'}</div>
                      <div><span className="font-medium">Address:</span> {partyLedger.party.address || '-'}</div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">Opening Balance</div>
                      <div className="text-2xl md:text-3xl font-bold text-gray-800">₹{partyLedger.summary.openingBalance.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">Total Debit</div>
                      <div className="text-2xl md:text-3xl font-bold text-blue-600">₹{partyLedger.summary.totalDebit.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">Total Credit</div>
                      <div className="text-2xl md:text-3xl font-bold text-green-600">₹{partyLedger.summary.totalCredit.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">Closing Balance</div>
                      <div className={`text-2xl md:text-3xl font-bold ${
                        partyLedger.summary.closingBalance > 0 
                          ? 'text-orange-600' 
                          : partyLedger.summary.closingBalance < 0 
                            ? 'text-red-600' 
                            : 'text-gray-800'
                      }`}>
                        ₹{Math.abs(partyLedger.summary.closingBalance).toFixed(2)}
                        {partyLedger.summary.closingBalance > 0 ? ' (Dr)' : partyLedger.summary.closingBalance < 0 ? ' (Cr)' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                      <h2 className="text-base md:text-lg font-semibold text-gray-800">Ledger Entries</h2>
                    </div>
                    {partyLedger.ledgerEntries.length === 0 ? (
                      <div className="p-10 text-center text-gray-500">No ledger entries found for selected period</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                              <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                              <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference No</th>
                              <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Debit</th>
                              <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Credit</th>
                              <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {partyLedger.ledgerEntries.map(entry => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 md:px-6 py-4 text-gray-800 text-sm md:text-base">
                                  {new Date(entry.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 md:px-6 py-4 text-gray-800 text-sm md:text-base font-medium">
                                  {entry.type}
                                </td>
                                <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">
                                  {entry.refNo}
                                </td>
                                <td className="px-4 md:px-6 py-4 text-right text-sm md:text-base">
                                  {entry.debit > 0 ? (
                                    <span className="text-blue-600 font-semibold">₹{entry.debit.toFixed(2)}</span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 md:px-6 py-4 text-right text-sm md:text-base">
                                  {entry.credit > 0 ? (
                                    <span className="text-green-600 font-semibold">₹{entry.credit.toFixed(2)}</span>
                                  ) : '-'}
                                </td>
                                <td className={`px-4 md:px-6 py-4 text-right text-sm md:text-base font-semibold ${
                                  entry.balance > 0 ? 'text-orange-600' : entry.balance < 0 ? 'text-red-600' : 'text-gray-800'
                                }`}>
                                  ₹{Math.abs(entry.balance).toFixed(2)}
                                  {entry.balance > 0 ? ' Dr' : entry.balance < 0 ? ' Cr' : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Reports
