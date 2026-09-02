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

function SuperAdminAnalytics() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BASE_API_URL}/superadmin/reports/dashboard`, { headers: getAuthHeaders() })
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
    topSellingDistributors,
    lowSellingDistributors,
    topSellingCsas,
    lowSellingCsas,
    revenueByChannel,
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
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
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

  const distributorDoughnutData = {
    labels: topSellingDistributors.map(p => p.name),
    datasets: [{
      data: topSellingDistributors.map(p => p.value),
      backgroundColor: [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
      ],
      borderWidth: 0
    }]
  }
  
  const csaDoughnutData = {
    labels: topSellingCsas.map(p => p.name),
    datasets: [{
      data: topSellingCsas.map(p => p.value),
      backgroundColor: [
        '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b',
        '#4f46e5', '#10b981', '#ef4444', '#f97316'
      ],
      borderWidth: 0
    }]
  }
  
  const channelDoughnutData = {
    labels: revenueByChannel.map(c => c.name),
    datasets: [{
      data: revenueByChannel.map(c => c.value),
      backgroundColor: ['#4f46e5', '#ec4899'],
      borderWidth: 0
    }]
  }

  const itemGroupDoughnutData = {
    labels: itemGroupSales.map(g => g.name),
    datasets: [{
      data: itemGroupSales.map(g => g.value),
      backgroundColor: [
        '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
        '#eab308', '#84cc16', '#22c55e', '#06b6d4',
        '#0ea5e9', '#6366f1'
      ],
      borderWidth: 0
    }]
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Global Analytics Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <span className="text-gray-500 text-sm font-medium">Global Last Month Sales</span>
            <div className="mt-2 text-2xl font-bold text-gray-800">₹{lastMonthSales.toLocaleString()}</div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200 p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500 rounded-bl-full opacity-10"></div>
            <span className="text-indigo-600 text-sm font-bold">Global This Month Sales</span>
            <div className="mt-2 text-3xl font-extrabold text-indigo-700">₹{thisMonthSales.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-5 flex flex-col justify-between">
            <span className="text-green-600 text-sm font-semibold">Global Growth</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${salesGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {salesGrowth >= 0 ? '+' : ''}{salesGrowth}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <span className="text-gray-500 text-sm font-medium">Projected Global Sales</span>
            <div className="mt-2 text-xl font-bold text-gray-700">₹{projectedSales.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
            <span className="text-gray-500 text-sm font-medium">Avg Global Invoice Value</span>
            <div className="mt-2 text-xl font-bold text-gray-700">₹{avgSales.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-3">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Global Daily Sales Trend (This vs Last Month)</h3>
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
              <h3 className="text-md font-bold text-gray-800 mb-4 text-center">Revenue by Channel</h3>
              <div className="h-[200px] flex justify-center">
                {revenueByChannel.some(c => c.value > 0) ? (
                  <Doughnut data={channelDoughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                ) : (
                  <div className="text-gray-400 flex items-center justify-center">No Data</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-md font-bold text-gray-800 mb-4 text-center">Top Performing Distributors</h3>
            <div className="h-[200px] flex justify-center">
              {topSellingDistributors.length > 0 ? (
                <Doughnut data={distributorDoughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              ) : (
                <div className="text-gray-400 flex items-center justify-center">No Data</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-md font-bold text-gray-800 mb-4 text-center">Top Performing CSAs</h3>
            <div className="h-[200px] flex justify-center">
              {topSellingCsas.length > 0 ? (
                <Doughnut data={csaDoughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              ) : (
                <div className="text-gray-400 flex items-center justify-center">No Data</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-md font-bold text-gray-800 mb-4 text-center">Top Global Categories</h3>
            <div className="h-[200px] flex justify-center">
              {itemGroupSales.length > 0 ? (
                <Doughnut data={itemGroupDoughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              ) : (
                <div className="text-gray-400 flex items-center justify-center">No Data</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3">
              <h3 className="font-bold text-red-700">Low Performing Distributors</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="text-left px-5 py-2">Distributor Name</th><th className="text-right px-5 py-2">Sales</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowSellingDistributors.map((p, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 font-medium text-gray-700">{p.name}</td>
                      <td className="px-5 py-3 text-right text-gray-600">₹{p.value.toLocaleString()}</td>
                    </tr>
                  ))}
                  {lowSellingDistributors.length === 0 && (
                    <tr><td colSpan="2" className="px-5 py-3 text-center text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3">
              <h3 className="font-bold text-red-700">Low Performing CSAs</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="text-left px-5 py-2">CSA Name</th><th className="text-right px-5 py-2">Sales</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowSellingCsas.map((p, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 font-medium text-gray-700">{p.name}</td>
                      <td className="px-5 py-3 text-right text-gray-600">₹{p.value.toLocaleString()}</td>
                    </tr>
                  ))}
                  {lowSellingCsas.length === 0 && (
                    <tr><td colSpan="2" className="px-5 py-3 text-center text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-100 px-5 py-3">
              <h3 className="font-bold text-orange-700">Needs Attention: Lowest Selling Products</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="text-left px-5 py-2">Product Name</th><th className="text-right px-5 py-2">Global Qty Sold</th></tr>
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

export default SuperAdminAnalytics
