import storage from '../utils/storage'

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Package, IndianRupee, FileText, Download, AlertCircle, RefreshCw, CreditCard, ArrowLeftCircle, ArrowRightCircle, Building2, Calendar } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function AdminCSADetails() {
  const { csaId } = useParams()
  const navigate = useNavigate()
  const [csa, setCsa] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const getDateRange = (filter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (filter) {
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
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        }
      case 'this-year':
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearEnd = new Date(today.getFullYear(), 11, 31)
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
    if (csaId) fetchCsaData()
  }, [csaId, dateFilter, customStartDate, customEndDate])

  const fetchCsaData = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange(dateFilter)
      let queryParams = ''
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) queryParams = '?' + params.toString()
      
      const res = await fetch(`${API_URL}/admin/csas/${csaId}${queryParams}`, { headers: getAuthHeaders() })

      if (res.ok) {
        const data = await res.json()
        setCsa(data)
      }
    } catch (err) {
      console.error('Failed to fetch CSA details:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0)
  const getNum = (val) => {
    if (typeof val === 'number') return val
    if (val?.toNumber) return val.toNumber()
    return parseFloat(val) || 0
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-lg">Loading CSA details...</div>
      </div>
    )
  }

  if (!csa) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-xl mb-4">CSA not found</div>
          <button onClick={() => navigate('/admin/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stats Grid 1 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-700">Total Distributors</p>
              <p className="text-3xl font-bold text-blue-900">{csa.distributors?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-xl">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-purple-700">Total Parties</p>
              <p className="text-3xl font-bold text-purple-900">{csa.totalParties}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-600 rounded-xl">
              <IndianRupee className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-green-700">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(csa.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-600 rounded-xl">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-orange-700">Total Invoices</p>
              <p className="text-3xl font-bold text-orange-900">{csa.totalInvoices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid 2 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-xl">
              <RefreshCw className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-red-700">Sales Returns</p>
              <p className="text-3xl font-bold text-red-900">{formatCurrency(csa.totalSalesReturns)}</p>
              <p className="text-xs text-red-600 mt-1">({csa.totalSalesReturnsCount} records)</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-xl">
              <CreditCard className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-emerald-700">Payments Received</p>
              <p className="text-3xl font-bold text-emerald-900">{formatCurrency(csa.totalPaymentsReceived)}</p>
              <p className="text-xs text-emerald-600 mt-1">({csa.totalPaymentInCount} records)</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-2xl border border-cyan-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-600 rounded-xl">
              <ArrowLeftCircle className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-cyan-700">Purchase Returns</p>
              <p className="text-3xl font-bold text-cyan-900">{formatCurrency(csa.totalPurchaseReturns)}</p>
              <p className="text-xs text-cyan-600 mt-1">({csa.totalPurchaseReturnCount} records)</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-2xl border border-rose-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 rounded-xl">
              <ArrowRightCircle className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-rose-700">Payments Out</p>
              <p className="text-3xl font-bold text-rose-900">{formatCurrency(csa.totalPaymentsOut)}</p>
              <p className="text-xs text-rose-600 mt-1">({csa.totalPaymentOutCount} records)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid 3 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-2xl border border-pink-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-600 rounded-xl">
              <AlertCircle className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-pink-700">Pending Claims</p>
              <p className="text-3xl font-bold text-pink-900">{csa.pendingClaimsCount}</p>
              <p className="text-xs text-pink-600 mt-1">Total: {csa.totalClaims} claims</p>
            </div>
          </div>
        </div>
      </div>

      {/* Distributors List */}
      {csa.distributors && csa.distributors.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Managed Distributors</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Company Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Owner</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">City</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {csa.distributors.map((dist) => (
                  <tr key={dist.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-medium text-gray-900">{dist.companyName}</td>
                    <td className="py-4 px-4 text-gray-600">{dist.ownerName}</td>
                    <td className="py-4 px-4 text-gray-600">{dist.city}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dist.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {dist.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => navigate(`/admin/distributor/${dist.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderParties = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Parties ({csa.parties?.length || 0})</h3>
      {csa.parties && csa.parties.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">GSTIN</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
              </tr>
            </thead>
            <tbody>
              {csa.parties.map((party) => (
                <tr key={party.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{party.name}</td>
                  <td className="py-4 px-4 text-gray-600">{party.gstin}</td>
                  <td className="py-4 px-4 text-gray-600">{party.phone}</td>
                  <td className="py-4 px-4 text-gray-600">{party.distributorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No parties yet</div>
      )}
    </div>
  )

  const renderProducts = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Products ({csa.products?.length || 0})</h3>
      {csa.products && csa.products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
              </tr>
            </thead>
            <tbody>
              {csa.products.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{product.name}</td>
                  <td className="py-4 px-4 text-gray-600">{product.sku}</td>
                  <td className="py-4 px-4 text-gray-600">{product.distributorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No products yet</div>
      )}
    </div>
  )

  const renderInvoices = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Invoices ({csa.invoices?.length || 0})</h3>
      {csa.invoices && csa.invoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Invoice #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {csa.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{inv.invoiceNo}</td>
                  <td className="py-4 px-4 text-gray-600">{inv.party?.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-green-600">{formatCurrency(inv.grandTotal)}</td>
                  <td className="py-4 px-4 text-gray-600">{inv.distributorName}</td>
                  <td className="py-4 px-4 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No invoices yet</div>
      )}
    </div>
  )

  const renderClaims = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Claims ({csa.claims?.length || 0})</h3>
      {csa.claims && csa.claims.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Brand</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Details</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
              </tr>
            </thead>
            <tbody>
              {csa.claims.map((claim) => (
                <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{claim.brandName}</td>
                  <td className="py-4 px-4 text-gray-600">{claim.claimDetails}</td>
                  <td className="py-4 px-4 text-right font-semibold">{formatCurrency(claim.amount)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      claim.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      claim.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{claim.distributorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No claims yet</div>
      )}
    </div>
  )

  const renderSalesReturns = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Sales Returns ({csa.salesReturns?.length || 0})</h3>
      {csa.salesReturns && csa.salesReturns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Return #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {csa.salesReturns.map((sr) => (
                <tr key={sr.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{sr.returnNo}</td>
                  <td className="py-4 px-4 text-gray-600">{sr.party?.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-red-600">{formatCurrency(sr.grandTotal)}</td>
                  <td className="py-4 px-4 text-gray-600">{sr.distributorName}</td>
                  <td className="py-4 px-4 text-gray-600">{new Date(sr.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No sales returns yet</div>
      )}
    </div>
  )

  const renderPaymentsIn = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Payments Received ({csa.paymentsIn?.length || 0})</h3>
      {csa.paymentsIn && csa.paymentsIn.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {csa.paymentsIn.map((pi) => (
                <tr key={pi.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{pi.paymentNo}</td>
                  <td className="py-4 px-4 text-gray-600">{pi.party?.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-green-600">{formatCurrency(pi.amount)}</td>
                  <td className="py-4 px-4 text-gray-600">{pi.distributorName}</td>
                  <td className="py-4 px-4 text-gray-600">{new Date(pi.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No payments received yet</div>
      )}
    </div>
  )

  const renderPurchaseReturns = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Purchase Returns ({csa.purchaseReturns?.length || 0})</h3>
      {csa.purchaseReturns && csa.purchaseReturns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Return #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Supplier</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {csa.purchaseReturns.map((pr) => (
                <tr key={pr.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{pr.returnNo}</td>
                  <td className="py-4 px-4 text-gray-600">{pr.supplierName}</td>
                  <td className="py-4 px-4 text-right font-semibold text-blue-600">{formatCurrency(pr.grandTotal)}</td>
                  <td className="py-4 px-4 text-gray-600">{pr.distributorName}</td>
                  <td className="py-4 px-4 text-gray-600">{new Date(pr.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No purchase returns yet</div>
      )}
    </div>
  )

  const renderPaymentsOut = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Payments Out ({csa.paymentsOut?.length || 0})</h3>
      {csa.paymentsOut && csa.paymentsOut.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Supplier</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Distributor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {csa.paymentsOut.map((po) => (
                <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{po.paymentNo}</td>
                  <td className="py-4 px-4 text-gray-600">{po.supplierName}</td>
                  <td className="py-4 px-4 text-right font-semibold text-orange-600">{formatCurrency(po.amount)}</td>
                  <td className="py-4 px-4 text-gray-600">{po.distributorName}</td>
                  <td className="py-4 px-4 text-gray-600">{new Date(po.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center">No payments out yet</div>
      )}
    </div>
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <button 
          onClick={() => navigate('/admin/dashboard')} 
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {csa.name}
        </h1>
      </div>
      
      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar size={20} />
            Filter by Date:
          </label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Time</option>
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-gray-500 text-sm font-medium">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
          <p className="text-xl font-semibold text-gray-900">{csa.name}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Contact</h3>
          <p className="text-xl font-semibold text-gray-900">{csa.email}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
          <p className="text-xl font-semibold text-gray-900">{csa.phone}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">City</h3>
          <p className="text-xl font-semibold text-gray-900">{csa.city}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'parties', label: `Parties (${csa.totalParties})` },
          { id: 'products', label: `Products (${csa.totalProducts})` },
          { id: 'invoices', label: `Invoices (${csa.totalInvoices})` },
          { id: 'salesReturns', label: `Sales Returns (${csa.totalSalesReturnsCount})` },
          { id: 'paymentsIn', label: `Payments In (${csa.totalPaymentInCount})` },
          { id: 'purchaseReturns', label: `Purchase Returns (${csa.totalPurchaseReturnCount})` },
          { id: 'paymentsOut', label: `Payments Out (${csa.totalPaymentOutCount})` },
          { id: 'claims', label: `Claims (${csa.totalClaims})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'parties' && renderParties()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'invoices' && renderInvoices()}
      {activeTab === 'salesReturns' && renderSalesReturns()}
      {activeTab === 'paymentsIn' && renderPaymentsIn()}
      {activeTab === 'purchaseReturns' && renderPurchaseReturns()}
      {activeTab === 'paymentsOut' && renderPaymentsOut()}
      {activeTab === 'claims' && renderClaims()}
    </div>
  )
}

export default AdminCSADetails

