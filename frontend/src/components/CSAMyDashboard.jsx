import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Users, FileText, RefreshCw, CreditCard, IndianRupee, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (amount) => {
  return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function CSAMyDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Admin User')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserName(user.name || 'Admin User')
    }
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-dashboard`, { headers: getAuthHeaders() })
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const totalRevenue = stats?.totalRevenue || 0;
  const totalPaymentsReceived = stats?.totalPaymentsReceived || 0;
  const totalPaymentsOut = stats?.totalPaymentsOut || 0;
  const totalSales = stats?.totalSales || 0;
  const totalSalesReturns = stats?.totalSalesReturns || 0;
  const totalPurchaseReturns = stats?.totalPurchaseReturns || 0;

  return (
    <div className="p-4 md:p-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Dashboard</h1>
          <p className="text-gray-500 mt-1">Your personal workspace statistics</p>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="mb-6 md:mb-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <p className="text-pink-100 text-sm md:text-lg mb-1 md:mb-2">Good morning,</p>
            <h2 className="text-2xl md:text-4xl font-bold">{userName}</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-full backdrop-blur-sm">
            <span className="text-sm">WORKSPACE PERFORMANCE</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Core Stats */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Core Stats</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {/* Total Distributors */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/csa/distributors')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Users size={20} className="md:w-8 md:h-8 text-blue-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Distributors</p>
              <p className="text-xl md:text-3xl font-bold text-blue-600 mt-2">{stats?.distributorCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Products in Stock */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/csa/my-products')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Package size={20} className="md:w-8 md:h-8 text-orange-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Products in Stock</p>
              <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">{stats?.productCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/csa/reports')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <IndianRupee size={20} className="md:w-8 md:h-8 text-yellow-700" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total Revenue</p>
              <p className="text-xl md:text-3xl font-bold text-yellow-700 mt-2">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Billing & Sales */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Billing & Sales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          {/* Payments Received */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <CreditCard size={20} className="md:w-8 md:h-8 text-green-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Received</p>
              <p className="text-xl md:text-3xl font-bold text-green-600 mt-2">{formatCurrency(totalPaymentsReceived)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats?.paymentInCount || 0} Transactions</p>
            </div>
          </div>

          {/* Sales Returns */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <RefreshCw size={20} className="md:w-8 md:h-8 text-red-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Sales Returns</p>
              <p className="text-xl md:text-3xl font-bold text-red-600 mt-2">{formatCurrency(totalSalesReturns)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats?.salesReturnCount || 0} Returns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Purchase */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Purchase Intake</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          {/* Payments Out */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-rose-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <ArrowRightCircle size={20} className="md:w-8 md:h-8 text-rose-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Out</p>
              <p className="text-xl md:text-3xl font-bold text-rose-600 mt-2">{formatCurrency(totalPaymentsOut)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats?.paymentOutCount || 0} Transactions</p>
            </div>
          </div>

          {/* Purchase Returns */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/csa/my-purchase-returns')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <ArrowLeftCircle size={20} className="md:w-8 md:h-8 text-cyan-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Purchase Returns</p>
              <p className="text-xl md:text-3xl font-bold text-cyan-600 mt-2">{formatCurrency(totalPurchaseReturns)}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphical Analysis */}
      <div className="mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Graphical Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Revenue vs Payments */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-base font-medium text-gray-700 mb-4">Revenue & Cash Flow</h3>
            <Bar
              data={{
                labels: ['Total Revenue', 'Payments In', 'Payments Out'],
                datasets: [
                  {
                    label: 'Amount (₹)',
                    data: [totalRevenue, totalPaymentsReceived, totalPaymentsOut],
                    backgroundColor: ['#4f46e5', '#22c55e', '#ef4444'],
                    borderRadius: 6
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </div>

          {/* Chart 2: Transaction Ratio */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-base font-medium text-gray-700 mb-4">Invoices & Returns Ratio</h3>
            <div className="max-w-xs mx-auto">
              <Doughnut
                data={{
                  labels: ['Total Sales', 'Sales Returns', 'Purchase Returns'],
                  datasets: [
                    {
                      data: [totalSales, totalSalesReturns, totalPurchaseReturns],
                      backgroundColor: ['#3b82f6', '#f43f5e', '#06b6d4']
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  cutout: '70%',
                  maintainAspectRatio: true
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CSAMyDashboard