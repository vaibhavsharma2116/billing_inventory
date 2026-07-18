import storage from '../utils/storage'
import { useState, useEffect } from 'react'

const BASE_API_URL = import.meta.env.VITE_API_URL
const API_URL = `${BASE_API_URL}/claims`

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function Claims() {
  const [activeTab, setActiveTab] = useState('extra-margin')
  const [extraMarginClaims, setExtraMarginClaims] = useState(null)
  const [displayClaims, setDisplayClaims] = useState([])
  const [gstReport, setGstReport] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClaim, setEditingClaim] = useState(null)
  const [formData, setFormData] = useState({ brandName: '', claimDetails: '', amount: '', status: 'PENDING' })
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const getDateRange = (filter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

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
    fetchExtraMarginClaims()
    fetchDisplayClaims()
    fetchGstReport()
  }, [dateFilter, customStartDate, customEndDate])

  const fetchExtraMarginClaims = async () => {
    try {
      const dateRange = getDateRange(dateFilter)
      let url = `${API_URL}/extra-margin`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() }).catch(() => null)
      if (res?.ok) {
        setExtraMarginClaims(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch extra margin claims')
    }
  }

  const fetchDisplayClaims = async () => {
    try {
      const dateRange = getDateRange(dateFilter)
      let url = API_URL
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() }).catch(() => null)
      if (res?.ok) {
        const data = await res.json()
        setDisplayClaims(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch display claims')
    }
  }

  const fetchGstReport = async () => {
    try {
      const dateRange = getDateRange(dateFilter)
      let url = `${API_URL}/gst-summary`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() }).catch(() => null)
      if (res?.ok) {
        const data = await res.json()
        setGstReport(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch GST report')
    }
  }

  const openAddModal = () => {
    setEditingClaim(null)
    setFormData({ brandName: '', claimDetails: '', amount: '', status: 'PENDING' })
    setIsModalOpen(true)
  }

  const openEditModal = (claim) => {
    setEditingClaim(claim)
    let amt = 0
    try {
      if (typeof claim?.amount === 'number') {
        amt = claim.amount
      } else if (claim?.amount?.toNumber) {
        amt = claim.amount.toNumber()
      } else if (claim?.amount) {
        amt = parseFloat(claim.amount)
      }
    } catch {
      amt = 0
    }
    setFormData({
      brandName: typeof claim?.brandName === 'string' ? claim.brandName : '',
      claimDetails: typeof claim?.claimDetails === 'string' ? claim.claimDetails : '',
      amount: amt.toString(),
      status: typeof claim?.status === 'string' ? claim.status : 'PENDING'
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const url = editingClaim ? `${API_URL}/${editingClaim.id}` : API_URL
      const method = editingClaim ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Failed to save claim')
      setIsModalOpen(false)
      fetchDisplayClaims()
    } catch (err) {
      console.error('Failed to save claim')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this claim?')) return
    try {
      await fetch(`${API_URL}/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      fetchDisplayClaims()
    } catch (err) {
      console.error('Failed to delete claim')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-blue-100 text-blue-800'
      case 'PAID': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNumber = (val) => {
    try {
      if (typeof val === 'number') return val
      if (val?.toNumber) return val.toNumber()
      if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val)
      return 0
    } catch { return 0 }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Claims & GST Reports</h1>

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
            { id: 'extra-margin', label: 'Extra Margin Claims' },
            { id: 'display-claims', label: 'Display Claims' },
            { id: 'gst-report', label: 'GST Summary Report' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Extra Margin Claims */}
      {activeTab === 'extra-margin' && extraMarginClaims && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Total Claim Amount</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600">
                ₹{getNumber(extraMarginClaims.totalClaimAmount).toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Number of Claims</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-600">
                {extraMarginClaims.count || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Extra Margin Claim Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice Date</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Margin %</th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Claim Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(extraMarginClaims.claims) && extraMarginClaims.claims.map((claim, i) => (
                    <tr key={claim?.id || i} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{claim?.productName || '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{claim?.invoiceNo || '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">
                        {claim?.invoiceDate ? new Date(claim.invoiceDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{claim?.qty || 0}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 text-sm md:text-base">{claim?.extraMarginPercentage || 0}%</td>
                      <td className="px-4 md:px-6 py-4 text-right font-semibold text-orange-600 text-sm md:text-base">
                        ₹{getNumber(claim?.claimAmount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Display Claims */}
      {activeTab === 'display-claims' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              + Add New Claim
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Display Claims</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand Name</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Claim Details</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(displayClaims) && displayClaims.map((claim) => (
                    <tr key={claim?.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{claim?.brandName || '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 max-w-xs truncate text-sm md:text-base">{claim?.claimDetails || '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 font-semibold text-sm md:text-base">
                        ₹{getNumber(claim?.amount).toFixed(2)}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(claim?.status)}`}>
                          {claim?.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(claim)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(claim?.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm md:text-base"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GST Summary Report */}
      {activeTab === 'gst-report' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">GST Summary Report (Monthly)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Taxable Value</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">CGST</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">SGST</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">IGST</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.isArray(gstReport) && gstReport.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 font-medium text-gray-800 text-sm md:text-base">{row?.month || '-'}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-gray-600 text-sm md:text-base">₹{getNumber(row?.taxableValue).toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-gray-600 text-sm md:text-base">₹{getNumber(row?.cgst).toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-gray-600 text-sm md:text-base">₹{getNumber(row?.sgst).toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-gray-600 text-sm md:text-base">₹{getNumber(row?.igst).toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-4 text-right font-semibold text-gray-900 text-sm md:text-base">₹{getNumber(row?.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {editingClaim ? 'Edit Claim' : 'Add New Claim'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claim Details *</label>
                <textarea
                  rows="3"
                  required
                  value={formData.claimDetails}
                  onChange={(e) => setFormData({ ...formData, claimDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  {loading ? 'Saving...' : (editingClaim ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Claims
