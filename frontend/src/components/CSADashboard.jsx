import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Building2, ArrowRight, Calendar, Download, Users, Package, IndianRupee, RefreshCw, CreditCard, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0)
}

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val) || 0
}

export default function CSADashboard({ view = 'dashboard' }) {
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState(view)
  const [distributors, setDistributors] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0])
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0])

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

  const fetchDistributors = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange(dateFilter)
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      params.append('excludeCSAs', 'true')

      const res = await fetch(`${API_URL}/csa/distributors?${params.toString()}`, {
        headers: getAuthHeaders()
      })
      
      if (res.ok) {
        const data = await res.json()
        setDistributors(data)
      }
    } catch (error) {
      console.error('Failed to fetch distributors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDistributors()
  }, [dateFilter, customStartDate, customEndDate])

  useEffect(() => {
    setCurrentView(view)
  }, [view])

  // Calculate aggregate stats
  const totalParties = distributors.reduce((sum, d) => sum + (d.partyCount || 0), 0)
  const totalProducts = distributors.reduce((sum, d) => sum + (d.productCount || 0), 0)
  const totalSales = distributors.reduce((sum, d) => sum + getNum(d.totalSales), 0)
  const totalSalesReturns = distributors.reduce((sum, d) => sum + getNum(d.totalSalesReturns), 0)
  const totalRevenue = totalSales - totalSalesReturns
  const totalPaymentsReceived = distributors.reduce((sum, d) => sum + getNum(d.totalPaymentsReceived), 0)
  const totalPurchaseReturns = distributors.reduce((sum, d) => sum + getNum(d.totalPurchaseReturns), 0)
  const totalPaymentsOut = distributors.reduce((sum, d) => sum + getNum(d.totalPaymentsOut), 0)
  const pendingPayments = Math.max(0, totalRevenue - totalPaymentsReceived)
  const activeDistributors = distributors.filter(d => d.isActive !== false).length

  // Chart Data
  const distributorSalesChartData = {
    labels: distributors.slice(0, 10).map(d => d.companyName),
    datasets: [
      {
        label: 'Total Revenue',
        data: distributors.slice(0, 10).map(d => getNum(d.totalRevenue)),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(34, 197, 94, 0.8)'
        ],
        borderColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#8B5CF6',
          '#EC4899',
          '#EF4444',
          '#6366F1',
          '#8B5CF6',
          '#EAB308',
          '#22C55E'
        ],
        borderWidth: 2
      }
    ]
  }

  const statusChartData = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        data: [activeDistributors, distributors.length - activeDistributors],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: '#ffffff',
        borderWidth: 2
      }
    ]
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom' }
    },
    scales: { y: { beginAtZero: true } }
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom' }
    }
  }

  const viewDistributorDetails = (distributorId) => {
    navigate(`/csa/distributor/${distributorId}`)
  }

  const downloadCSAReport = () => {
    const activeCount = activeDistributors
    const inactiveCount = distributors.length - activeCount
    const totalRevenueAll = totalRevenue
    const avgRevenue = distributors.length > 0 ? totalRevenueAll / distributors.length : 0

    const summaryHeaders = ['Metric', 'Value']
    const summaryRows = [
      ['Report Generated On', new Date().toLocaleString()],
      ['Total Distributors', distributors.length],
      ['Active Distributors', activeCount],
      ['Inactive Distributors', inactiveCount],
      ['Total Revenue', `₹${totalRevenueAll.toLocaleString()}`],
      ['Average Revenue per Distributor', `₹${Math.round(avgRevenue).toLocaleString()}`]
    ]

    const detailHeaders = ['Company Name', 'Owner Name', 'Email', 'City', 'Status', 'Total Revenue', 'Invoices', 'Parties']
    const detailRows = distributors.map(d => [
      d.companyName,
      d.ownerName,
      d.email,
      d.city,
      d.isActive !== false ? 'Active' : 'Inactive',
      `₹${getNum(d.totalRevenue).toLocaleString()}`,
      d.invoiceCount,
      d.partyCount
    ])

    let csvContent = '===== CSA REPORT =====\n'
    csvContent += summaryHeaders.join(',') + '\n'
    summaryRows.forEach(row => { csvContent += row.join(',') + '\n' })
    csvContent += '\n===== DISTRIBUTOR DETAILS =====\n'
    csvContent += detailHeaders.join(',') + '\n'
    detailRows.forEach(row => { csvContent += row.join(',') + '\n' })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `csa_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            CSA Console <span className="text-xs md:text-sm text-cyan-500 font-semibold bg-cyan-100 px-2 md:px-3 py-1 rounded-full">{currentView === 'dashboard' ? 'DASHBOARD' : 'DISTRIBUTORS'}</span>
          </h1>
        </div>

        {/* Date Filter and Download Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <label className="text-sm font-semibold text-gray-700">Filter by Date:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              >
                <option value="">All Time</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="this-year">This Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            {!loading && distributors.length > 0 && (
              <button
                onClick={downloadCSAReport}
                className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-green-600 text-white text-sm md:text-base font-medium rounded-lg md:rounded-xl hover:bg-green-700 transition-all w-full md:w-auto"
              >
                <Download size={16} className="md:w-5 md:h-5" />
                Download Report
              </button>
            )}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-col md:flex-row gap-4 mt-4 items-start md:items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
              <span className="text-gray-500 text-sm font-medium">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
          )}
        </div>

        {currentView === 'dashboard' && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6">
              <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                    <Building2 size={20} className="md:w-8 md:h-8 text-cyan-600" />
                  </div>
                  <p className="text-sm md:text-lg font-semibold text-gray-800">Total Distributors</p>
                  <p className="text-xl md:text-3xl font-bold text-cyan-600 mt-2">{loading ? '...' : distributors.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                    <Package size={20} className="md:w-8 md:h-8 text-orange-600" />
                  </div>
                  <p className="text-sm md:text-lg font-semibold text-gray-800">Products</p>
                  <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">{loading ? '...' : totalProducts}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                    <IndianRupee size={20} className="md:w-8 md:h-8 text-yellow-700" />
                  </div>
                  <p className="text-sm md:text-lg font-semibold text-gray-800">Total Revenue</p>
                  <p className="text-xl md:text-3xl font-bold text-yellow-700 mt-2">₹{loading ? '...' : totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                    <RefreshCw size={20} className="md:w-8 md:h-8 text-red-600" />
                  </div>
                  <p className="text-sm md:text-lg font-semibold text-gray-800">Sales Returns</p>
                  <p className="text-xl md:text-3xl font-bold text-red-600 mt-2">₹{loading ? '...' : totalSalesReturns.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                    <CreditCard size={20} className="md:w-8 md:h-8 text-green-600" />
                  </div>
                  <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Received</p>
                  <p className="text-xl md:text-3xl font-bold text-green-600 mt-2">₹{loading ? '...' : totalPaymentsReceived.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                    <IndianRupee size={20} className="md:w-8 md:h-8 text-orange-600" />
                  </div>
                  <p className="text-sm md:text-lg font-semibold text-gray-800">Pending Payments</p>
                  <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">₹{loading ? '...' : pendingPayments.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="text-cyan-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-800">Top Distributors by Sales</h3>
                </div>
                <div className="h-64">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : (
                    <Bar data={distributorSalesChartData} options={barChartOptions} />
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon className="text-green-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-800">Active vs Inactive</h3>
                </div>
                <div className="h-64">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : (
                    <Pie data={statusChartData} options={pieChartOptions} />
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {currentView === 'directory' && (
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 md:px-8 md:py-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Building2 size={20} /> Distributors
              </h3>
            </div>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-500">Loading distributors...</p>
              </div>
            ) : distributors.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No distributors yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoices</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {distributors.map((distributor) => (
                      <tr 
                        key={distributor.distributorId}
                        className="hover:bg-gray-50 transition-colors bg-gray-50/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl flex items-center justify-center mr-3">
                              <Building2 size={20} className="text-cyan-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{distributor.companyName}</div>
                              <div className="text-sm text-gray-500">{distributor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{distributor.ownerName}</div>
                          <div className="text-sm text-gray-500">{distributor.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {distributor.city}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-green-600">
                            {formatCurrency(distributor.totalRevenue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                          {distributor.invoiceCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            distributor.isActive !== false 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {distributor.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              localStorage.setItem('csaDistributorId', distributor.distributorId)
                              viewDistributorDetails(distributor.distributorId)
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg hover:from-cyan-600 hover:to-teal-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                          >
                            View <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
