import { useState, useEffect } from 'react'
import { Package, Users, FileText, RefreshCw, CreditCard, IndianRupee } from 'lucide-react'

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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Dashboard</h1>
          <p className="text-gray-500 mt-1">Your personal workspace statistics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <FileText size={20} className="md:w-8 md:h-8 text-blue-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Invoices</p>
            <p className="text-xl md:text-3xl font-bold text-blue-600 mt-2">{stats?.invoiceCount || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <IndianRupee size={20} className="md:w-8 md:h-8 text-green-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Total Sales</p>
            <p className="text-xl md:text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats?.totalSales)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <Users size={20} className="md:w-8 md:h-8 text-purple-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Parties</p>
            <p className="text-xl md:text-3xl font-bold text-purple-600 mt-2">{stats?.partyCount || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <Package size={20} className="md:w-8 md:h-8 text-orange-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Products</p>
            <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">{stats?.productCount || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <RefreshCw size={20} className="md:w-8 md:h-8 text-red-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Sales Returns</p>
            <p className="text-xl md:text-3xl font-bold text-red-600 mt-2">{stats?.salesReturnCount || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-teal-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <CreditCard size={20} className="md:w-8 md:h-8 text-teal-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Payments In</p>
            <p className="text-xl md:text-3xl font-bold text-teal-600 mt-2">{stats?.paymentInCount || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-pink-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <RefreshCw size={20} className="md:w-8 md:h-8 text-pink-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Purchase Returns</p>
            <p className="text-xl md:text-3xl font-bold text-pink-600 mt-2">{stats?.purchaseReturnCount || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <CreditCard size={20} className="md:w-8 md:h-8 text-cyan-600" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Out</p>
            <p className="text-xl md:text-3xl font-bold text-cyan-600 mt-2">{stats?.paymentOutCount || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CSAMyDashboard