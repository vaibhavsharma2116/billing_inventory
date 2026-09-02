import React, { useState, useEffect } from 'react';
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
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import storage from '../utils/storage';

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
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DistributorReports = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [returnsData, setReturnsData] = useState(null);
  const [registersData, setRegistersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = ['Dashboard', 'Inventory', 'Returns', 'Registers'];

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const token = storage.getItem('token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      if (tab === 'Dashboard' && !dashboardData) {
        const res = await fetch(`${API_URL}/reports/distributor/dashboard`, { headers });
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        setDashboardData(data);
      } else if (tab === 'Inventory' && !inventoryData) {
        const res = await fetch(`${API_URL}/reports/distributor/inventory`, { headers });
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        setInventoryData(data);
      } else if (tab === 'Returns' && !returnsData) {
        const res = await fetch(`${API_URL}/reports/distributor/returns`, { headers });
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        setReturnsData(data);
      } else if (tab === 'Registers' && !registersData) {
        const res = await fetch(`${API_URL}/reports/distributor/registers`, { headers });
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        setRegistersData(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data for this section.');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    if (!dashboardData) return null;

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
    } = dashboardData;

    const partyColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8A2BE2', '#00FA9A'];
    const itemGroupColors = ['#FF9F40', '#4BC0C0', '#FF6384', '#36A2EB', '#9966FF', '#FFCE56', '#8A2BE2'];

    const partyChartData = {
      labels: topSellingParties.map(p => p.name),
      datasets: [
        {
          data: topSellingParties.map(p => p.value),
          backgroundColor: partyColors,
          borderWidth: 1,
        },
      ],
    };

    const itemGroupChartData = {
      labels: itemGroupSales.map(i => i.name),
      datasets: [
        {
          data: itemGroupSales.map(i => i.value),
          backgroundColor: itemGroupColors,
          borderWidth: 1,
        },
      ],
    };

    const dailyChartData = {
      labels: dailySales.map(d => `Day ${d.day}`),
      datasets: [
        {
          label: 'This Month Sales',
          data: dailySales.map(d => d.currentMonth),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Last Month Sales',
          data: dailySales.map(d => d.lastMonth),
          borderColor: '#FFCE56',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4
        }
      ],
    };

    return (
      <div className="space-y-6 animate-fade-in bg-slate-50 p-4 rounded-lg">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-pink-100 p-4 rounded-xl shadow-sm border border-pink-200">
            <h3 className="text-xs font-bold text-pink-700 uppercase">Last Month Sales</h3>
            <p className="text-2xl font-bold text-pink-900 mt-1">₹{lastMonthSales.toLocaleString()}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-xl shadow-sm border border-blue-200">
            <h3 className="text-xs font-bold text-blue-700 uppercase">This Month Till Date</h3>
            <p className="text-2xl font-bold text-blue-900 mt-1">₹{thisMonthSales.toLocaleString()}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-xl shadow-sm border border-purple-200">
            <h3 className="text-xs font-bold text-purple-700 uppercase">Projected Sales</h3>
            <p className="text-2xl font-bold text-purple-900 mt-1">₹{projectedSales.toLocaleString()}</p>
          </div>
          <div className="bg-teal-100 p-4 rounded-xl shadow-sm border border-teal-200">
            <h3 className="text-xs font-bold text-teal-700 uppercase">Growth/De-growth</h3>
            <p className={`text-2xl font-bold mt-1 ${salesGrowth >= 0 ? 'text-teal-900' : 'text-red-600'}`}>
              {salesGrowth > 0 ? '+' : ''}{salesGrowth}%
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-xl shadow-sm border border-yellow-200">
            <h3 className="text-xs font-bold text-yellow-700 uppercase">Avg Invoice Value</h3>
            <p className="text-2xl font-bold text-yellow-900 mt-1">₹{avgSales.toLocaleString()}</p>
          </div>
        </div>

        {/* Charts Row 1: Doughnuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-wide">Route / Party Wise Sales</h3>
            <div className="h-64 flex justify-center">
              {topSellingParties.length > 0 ? (
                <Doughnut data={partyChartData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }} />
              ) : (
                <p className="text-gray-500 my-auto text-sm">No sales data found for this month.</p>
              )}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-wide">Item Group Wise Sales</h3>
            <div className="h-64 flex justify-center">
              {itemGroupSales.length > 0 ? (
                <Doughnut data={itemGroupChartData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }} />
              ) : (
                <p className="text-gray-500 my-auto text-sm">No data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Chart Row 2: Main Daily Sales Comparison */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4 text-center uppercase tracking-wide">Monthly Sales Comparison (Day-by-Day)</h3>
          <div className="h-72">
            <Bar 
              data={{...dailyChartData, datasets: dailyChartData.datasets.map(d => ({...d, type: 'line'}))}} 
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} 
            />
          </div>
        </div>

        {/* Product Performance Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-wide">Top Low Selling SKUs</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="py-2 px-3 rounded-tl-lg">Product Name</th>
                  <th className="py-2 px-3 rounded-tr-lg text-right">Qty Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowSellingProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-red-50">
                    <td className="py-2 px-3 text-gray-700 font-medium truncate max-w-xs">{p.name}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-500">{p.qty}</td>
                  </tr>
                ))}
                {lowSellingProducts.length === 0 && (
                  <tr><td colSpan="2" className="text-center py-4 text-gray-400">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-wide">Top Low Selling Routes (Parties)</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="py-2 px-3 rounded-tl-lg">Party Name</th>
                  <th className="py-2 px-3 rounded-tr-lg text-right">Sales Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowSellingParties.map((p, i) => (
                  <tr key={i} className="hover:bg-orange-50">
                    <td className="py-2 px-3 text-gray-700 font-medium truncate max-w-xs">{p.name}</td>
                    <td className="py-2 px-3 text-right font-bold text-orange-500">₹{p.value.toLocaleString()}</td>
                  </tr>
                ))}
                {lowSellingParties.length === 0 && (
                  <tr><td colSpan="2" className="text-center py-4 text-gray-400">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInventory = () => {
    if (!inventoryData) return null;
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Warehouse Inventory Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Stock Items</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{inventoryData.summary.totalStock}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Purchase Value</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">₹{inventoryData.summary.totalPurchaseValue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Retail Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{inventoryData.summary.totalRetailValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">S.No.</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Product Code</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wider">Stock Qty</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wider">Purchase Price</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wider">Purchase Value</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wider">Retail Price</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wider">Retail Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryData.inventory.map((item, i) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">{item.currentStock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">₹{item.costPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">₹{item.purchaseValue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">₹{item.retailPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">₹{item.retailValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReturns = () => {
    if (!returnsData) return null;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Sales Returns (From Parties)</h3>
          <div className="overflow-y-auto max-h-96">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 sticky top-0 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">S.No.</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Return No</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Party</th>
                  <th className="px-4 py-3 font-semibold text-right text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returnsData.salesReturns.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{r.returnNo}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-800">{r.partyName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">₹{r.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
                {returnsData.salesReturns.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-4 text-gray-500">No sales returns found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Purchase Returns (To Supplier)</h3>
          <div className="overflow-y-auto max-h-96">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 sticky top-0 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">S.No.</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Return No</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Supplier</th>
                  <th className="px-4 py-3 font-semibold text-right text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returnsData.purchaseReturns.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{r.returnNo}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-800">{r.supplierName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">₹{r.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
                {returnsData.purchaseReturns.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-4 text-gray-500">No purchase returns found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRegisters = () => {
    if (!registersData) return null;
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Sales Register</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-indigo-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">S.No.</th>
                  <th className="px-4 py-3 text-left font-medium">Invoice No</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Customer Name</th>
                  <th className="px-4 py-3 text-left font-medium">GSTIN</th>
                  <th className="px-4 py-3 text-right font-medium">Total Tax</th>
                  <th className="px-4 py-3 text-right font-medium">Total Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registersData.salesRegister.map((inv, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-900">{inv.partyName}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.gstin}</td>
                    <td className="px-4 py-3 text-right text-gray-600">₹{inv.taxAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">₹{inv.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Purchase Register</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-cyan-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">S.No.</th>
                  <th className="px-4 py-3 text-left font-medium">Req / Invoice No</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Supplier Name</th>
                  <th className="px-4 py-3 text-left font-medium">GSTIN</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registersData.purchaseRegister.map((pur, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-cyan-600">{pur.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(pur.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-900">{pur.supplierName}</td>
                    <td className="px-4 py-3 text-gray-500">{pur.gstin}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        pur.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        pur.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {pur.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">₹{pur.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Deep dive into your business performance and insights</p>
          </div>
        </div>

        {/* Custom Tab Navigation (Matching screenshot style) */}
        <div className="border-b border-gray-200 mb-8 bg-white rounded-t-xl px-4 pt-4 shadow-sm">
          <nav className="-mb-px flex space-x-8 overflow-x-auto hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap pb-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200
                  ${activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab === 'Dashboard' && 'Dashboard Sales Summary'}
                {tab === 'Inventory' && 'Inventory Reports'}
                {tab === 'Returns' && 'Return Reports'}
                {tab === 'Registers' && 'Purchase / Sales Register Reports'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-center font-medium">
              {error}
            </div>
          ) : (
            <>
              {activeTab === 'Dashboard' && renderDashboard()}
              {activeTab === 'Inventory' && renderInventory()}
              {activeTab === 'Returns' && renderReturns()}
              {activeTab === 'Registers' && renderRegisters()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributorReports;
