import React, { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import storage from '../utils/storage'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const BASE_API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function CSAAnalytics() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BASE_API_URL}/csa/my-reports/dashboard`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      setDashboardData(await res.json())
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">Failed to load analytics data.</div>
      </div>
    )
  }

  const {
    thisMonthSales,
    lastMonthSales,
    salesGrowth,
    projectedSales,
    avgSales,
    dailySales,
    topSellingParties,
    lowSellingParties,
    itemGroupSales,
    lowSellingProducts
  } = dashboardData

  const lineChartData = {
    labels: dailySales.map(d => d.day),
    datasets: [
      {
        type: 'line',
        label: 'This Month (₹)',
        data: dailySales.map(d => d.currentMonth),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        type: 'bar',
        label: 'Last Month (₹)',
        data: dailySales.map(d => d.lastMonth),
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        borderRadius: 4
      }
    ]
  }

  const partyDoughnutData = {
    labels: topSellingParties.map(p => p.name),
    datasets: [{
      data: topSellingParties.map(p => p.value),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
      ],
      borderWidth: 0
    }]
  }

  const itemGroupDoughnutData = {
    labels: itemGroupSales.map(g => g.name),
    datasets: [{
      data: itemGroupSales.map(g => g.value),
      backgroundColor: [
        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
        '#f97316', '#eab308', '#84cc16', '#22c55e',
        '#06b6d4', '#0ea5e9'
      ],
      borderWidth: 0
    }]
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <span className="text-gray-500 text-sm font-medium">Last Month Sales</span>
            <div className="mt-2 text-2xl font-bold text-gray-800">₹{lastMonthSales.toLocaleString()}</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 rounded-bl-full opacity-10"></div>
            <span className="text-blue-600 text-sm font-bold">This Month Sales</span>
            <div className="mt-2 text-3xl font-extrabold text-blue-700">₹{thisMonthSales.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-5 flex flex-col justify-between">
            <span className="text-green-600 text-sm font-semibold">Growth</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${salesGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {salesGrowth >= 0 ? '+' : ''}{salesGrowth}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <span className="text-gray-500 text-sm font-medium">Projected Sales</span>
            <div className="mt-2 text-xl font-bold text-gray-700">₹{projectedSales.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <span className="text-gray-500 text-sm font-medium">Avg Invoice Value</span>
            <div className="mt-2 text-xl font-bold text-gray-700">₹{avgSales.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Sales Trend (This vs Last Month)</h3>
            <div className="h-[300px] w-full">
              <Bar 
                data={lineChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: { legend: { position: 'top' } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                  }
                }} 
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-md font-bold text-gray-800 mb-4 text-center">Top Distributors</h3>
              <div className="h-[200px] flex justify-center">
                {topSellingParties.length > 0 ? (
                  <Doughnut data={partyDoughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                ) : (
                  <div className="text-gray-400 flex items-center justify-center">No Data</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-md font-bold text-gray-800 mb-4 text-center">Top Categories</h3>
              <div className="h-[200px] flex justify-center">
                {itemGroupSales.length > 0 ? (
                  <Doughnut data={itemGroupDoughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                ) : (
                  <div className="text-gray-400 flex items-center justify-center">No Data</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3">
              <h3 className="font-bold text-red-700">Needs Attention: Low Performing Distributors</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="text-left px-5 py-2">Distributor</th><th className="text-right px-5 py-2">Sales</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowSellingParties.map((p, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 font-medium text-gray-700">{p.name}</td>
                      <td className="px-5 py-3 text-right text-gray-600">₹{p.value.toLocaleString()}</td>
                    </tr>
                  ))}
                  {lowSellingParties.length === 0 && (
                    <tr><td colSpan="2" className="px-5 py-3 text-center text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-100 px-5 py-3">
              <h3 className="font-bold text-orange-700">Needs Attention: Low Performing Products</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="text-left px-5 py-2">Product</th><th className="text-right px-5 py-2">Qty Sold</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowSellingProducts.map((p, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 font-medium text-gray-700">{p.name}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{p.qty}</td>
                    </tr>
                  ))}
                  {lowSellingProducts.length === 0 && (
                    <tr><td colSpan="2" className="px-5 py-3 text-center text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CSAAnalytics
