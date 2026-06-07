import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Package, IndianRupee, FileText, Download, AlertCircle, RefreshCw, CreditCard, ArrowLeftCircle, ArrowRightCircle, Building2, Calendar } from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function AdminDistributorDetails() {
  const { distributorId } = useParams()
  const navigate = useNavigate()
  const [distributor, setDistributor] = useState(null)
  const [distributorRanking, setDistributorRanking] = useState([])
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
    if (distributorId) fetchDistributorData()
  }, [distributorId, dateFilter, customStartDate, customEndDate])

  const fetchDistributorData = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange(dateFilter)
      let queryParams = ''
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) queryParams = '?' + params.toString()
      
      const [distRes, rankingRes] = await Promise.all([
        fetch(`${API_URL}/admin/distributors/${distributorId}${queryParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admin/reports/distributor-ranking${queryParams}`, { headers: getAuthHeaders() })
      ])

      if (distRes.ok) {
        const dist = await distRes.json()
        setDistributor(dist)
      }

      if (rankingRes.ok) {
        const data = await rankingRes.json()
        setDistributorRanking(data)
      }
    } catch (err) {
      console.error('Failed to fetch distributor details:', err)
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
  
  const downloadDistributorReport = () => {
    const sales = getNum(distributor.totalSales)
    const totalSalesAll = distributorRanking.reduce((sum, d) => sum + getNum(d.totalSales), 0)
    const avgSales = distributorRanking.length > 0 ? totalSalesAll / distributorRanking.length : 0
    const rank = distributorRanking.findIndex(d => d.distributorId === distributor.id || d.distributorId === distributor.distributorId) + 1
    const totalDistributors = distributorRanking.length
    const marketShare = totalSalesAll > 0 ? Math.round((sales / totalSalesAll) * 100) : 0
    const salesVsAvg = avgSales > 0 ? Math.round(((sales - avgSales) / avgSales) * 100) : 0

    const getPerformanceTier = (s) => {
      if (s >= avgSales * 1.5) return 'Top Performer'
      if (s >= avgSales * 0.8) return 'Good Performer'
      if (s >= avgSales * 0.5) return 'Average Performer'
      return 'Needs Attention'
    }

    const summaryHeaders = ['Metric', 'Value']
    const summaryRows = [
      ['Report Generated On', new Date().toLocaleString()],
      ['Company Name', distributor.companyName],
      ['Owner Name', distributor.ownerName],
      ['Email', distributor.email],
      ['Phone', distributor.phone],
      ['City', distributor.city],
      ['GSTIN', distributor.gstIn],
      ['Status', distributor.isActive !== false ? 'Active' : 'Inactive'],
      ['', ''],
      ['=== PERFORMANCE METRICS ===', ''],
      ['Rank', rank > 0 ? `${rank} / ${totalDistributors}` : 'N/A'],
      ['Performance Tier', getPerformanceTier(sales)],
      ['Total Sales', `₹${sales.toLocaleString()}`],
      ['Market Share', `${marketShare}%`],
      ['Sales vs Average', `${salesVsAvg > 0 ? '+' : ''}${salesVsAvg}%`],
      ['Invoice Count', distributor.invoiceCount],
      ['Party Count', distributor.partyCount],
      ['Product Count', distributor.productCount]
    ]

    let csvContent = ''
    csvContent += '===== DISTRIBUTOR PERFORMANCE REPORT =====\n'
    csvContent += summaryHeaders.join(',') + '\n'
    summaryRows.forEach(row => { csvContent += row.join(',') + '\n' })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${distributor.companyName.replace(/\s+/g, '_')}_detailed_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-lg">Loading distributor details...</div>
      </div>
    )
  }

  if (!distributor) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-xl mb-4">Distributor not found</div>
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
              <Users className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-700">Total Parties</p>
              <p className="text-3xl font-bold text-blue-900">{distributor.partyCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-xl">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-purple-700">Total Products</p>
              <p className="text-3xl font-bold text-purple-900">{distributor.productCount}</p>
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
              <p className="text-3xl font-bold text-green-900">{formatCurrency(distributor.totalRevenue)}</p>
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
              <p className="text-3xl font-bold text-orange-900">{distributor.invoiceCount}</p>
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
              <p className="text-3xl font-bold text-red-900">{formatCurrency(distributor.totalSalesReturns)}</p>
              <p className="text-xs text-red-600 mt-1">({distributor.salesReturnCount} records)</p>
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
              <p className="text-3xl font-bold text-emerald-900">{formatCurrency(distributor.totalPaymentsReceived)}</p>
              <p className="text-xs text-emerald-600 mt-1">({distributor.paymentInCount} records)</p>
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
              <p className="text-3xl font-bold text-cyan-900">{formatCurrency(distributor.totalPurchaseReturns)}</p>
              <p className="text-xs text-cyan-600 mt-1">({distributor.purchaseReturnCount} records)</p>
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
              <p className="text-3xl font-bold text-rose-900">{formatCurrency(distributor.totalPaymentsOut)}</p>
              <p className="text-xs text-rose-600 mt-1">({distributor.paymentOutCount} records)</p>
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
              <p className="text-3xl font-bold text-pink-900">{distributor.pendingClaimsCount}</p>
              <p className="text-xs text-pink-600 mt-1">Total: {distributor.claimCount} claims</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Parties Section */}
      {distributor.partySales && distributor.partySales.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top Performing Parties</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">GSTIN</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Phone</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Invoices</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {distributor.partySales.slice(0, 10).map((party, idx) => (
                  <tr key={party.partyId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{party.partyName}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{party.gstin}</td>
                    <td className="py-4 px-4 text-gray-600">{party.phone}</td>
                    <td className="py-4 px-4 text-right font-medium">{party.invoiceCount}</td>
                    <td className="py-4 px-4 text-right font-semibold text-green-600">
                      {formatCurrency(party.totalBilling)}
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Parties ({distributor.parties?.length || 0})</h3>
      {distributor.parties && distributor.parties.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">GSTIN</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Address</th>
              </tr>
            </thead>
            <tbody>
              {distributor.parties.map((party) => (
                <tr key={party.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{party.name}</td>
                  <td className="py-4 px-4 text-gray-600">{party.gstin}</td>
                  <td className="py-4 px-4 text-gray-600">{party.phone}</td>
                  <td className="py-4 px-4 text-gray-600">{party.address}</td>
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Products ({distributor.products?.length || 0})</h3>
      {distributor.products && distributor.products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">HSN</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Stock</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Selling Price</th>
              </tr>
            </thead>
            <tbody>
              {distributor.products.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{product.name}</td>
                  <td className="py-4 px-4 text-gray-600">{product.sku}</td>
                  <td className="py-4 px-4 text-gray-600">{product.hsn}</td>
                  <td className={`py-4 px-4 text-right font-medium ${product.currentStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.currentStock}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">{formatCurrency(product.baseSellingPrice)}</td>
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Invoices ({distributor.invoices?.length || 0})</h3>
      {distributor.invoices && distributor.invoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Invoice #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {distributor.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{inv.invoiceNo}</td>
                  <td className="py-4 px-4 text-gray-600">{inv.party?.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-green-600">{formatCurrency(inv.grandTotal)}</td>
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Claims ({distributor.claims?.length || 0})</h3>
      {distributor.claims && distributor.claims.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Brand</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Details</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {distributor.claims.map((claim) => (
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Sales Returns ({distributor.salesReturns?.length || 0})</h3>
      {distributor.salesReturns && distributor.salesReturns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Return #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {distributor.salesReturns.map((sr) => (
                <tr key={sr.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{sr.returnNo}</td>
                  <td className="py-4 px-4 text-gray-600">{sr.party?.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-red-600">{formatCurrency(sr.grandTotal)}</td>
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Payments Received ({distributor.paymentsIn?.length || 0})</h3>
      {distributor.paymentsIn && distributor.paymentsIn.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment Mode</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {distributor.paymentsIn.map((pi) => (
                <tr key={pi.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{pi.paymentNo}</td>
                  <td className="py-4 px-4 text-gray-600">{pi.party?.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-green-600">{formatCurrency(pi.amount)}</td>
                  <td className="py-4 px-4 text-gray-600">{pi.paymentMode}</td>
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Purchase Returns ({distributor.purchaseReturns?.length || 0})</h3>
      {distributor.purchaseReturns && distributor.purchaseReturns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Return #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Supplier</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {distributor.purchaseReturns.map((pr) => (
                <tr key={pr.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{pr.returnNo}</td>
                  <td className="py-4 px-4 text-gray-600">{pr.supplierName}</td>
                  <td className="py-4 px-4 text-right font-semibold text-blue-600">{formatCurrency(pr.grandTotal)}</td>
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
      <h3 className="text-xl font-bold text-gray-900 mb-6">All Payments Out ({distributor.paymentsOut?.length || 0})</h3>
      {distributor.paymentsOut && distributor.paymentsOut.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Supplier</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment Mode</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {distributor.paymentsOut.map((po) => (
                <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{po.paymentNo}</td>
                  <td className="py-4 px-4 text-gray-600">{po.supplierName}</td>
                  <td className="py-4 px-4 text-right font-semibold text-orange-600">{formatCurrency(po.amount)}</td>
                  <td className="py-4 px-4 text-gray-600">{po.paymentMode}</td>
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
          {distributor.companyName}
          <span className={`ml-3 text-sm px-3 py-1 rounded-full ${distributor.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {distributor.isActive ? 'Active' : 'Inactive'}
          </span>
        </h1>
        <div className="flex gap-3 ml-auto">
          <button
            onClick={downloadDistributorReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Download Report
          </button>
        </div>
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
          <h3 className="text-sm font-medium text-gray-500 mb-1">Owner</h3>
          <p className="text-xl font-semibold text-gray-900">{distributor.ownerName}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Contact</h3>
          <p className="text-xl font-semibold text-gray-900">{distributor.email}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
          <p className="text-xl font-semibold text-gray-900">{distributor.city}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">GSTIN</h3>
          <p className="text-xl font-semibold text-gray-900">{distributor.gstIn}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'parties', label: `Parties (${distributor.partyCount})` },
          { id: 'products', label: `Products (${distributor.productCount})` },
          { id: 'invoices', label: `Invoices (${distributor.invoiceCount})` },
          { id: 'salesReturns', label: `Sales Returns (${distributor.salesReturnCount})` },
          { id: 'paymentsIn', label: `Payments In (${distributor.paymentInCount})` },
          { id: 'purchaseReturns', label: `Purchase Returns (${distributor.purchaseReturnCount})` },
          { id: 'paymentsOut', label: `Payments Out (${distributor.paymentOutCount})` },
          { id: 'claims', label: `Claims (${distributor.claimCount})` }
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

export default AdminDistributorDetails
