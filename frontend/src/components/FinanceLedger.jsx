import { useEffect, useState } from 'react'
import { Package, IndianRupee, AlertCircle, Search } from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

function FinanceLedger() {
  const [financialData, setFinancialData] = useState([])
  const [overallTotals, setOverallTotals] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/superadmin/finance/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setFinancialData(data.overview)
        setOverallTotals(data.overallTotals)
      }
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = financialData.filter(distributor => 
    distributor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Master Financial Control Ledger
        </h1>
        <p className="text-gray-600">Complete financial overview of all distributors and CSAs</p>
      </div>

      {/* Global Ledger Summary Cards */}
      {overallTotals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 md:w-12 h-10 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-blue-600 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Total Dispatched Stock Value</p>
                <p className="text-xl md:text-2xl font-bold text-blue-700">
                  ₹{overallTotals.totalCompanyDebits.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 md:w-12 h-10 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <IndianRupee size={20} className="text-green-600 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Total Market Sales Realized</p>
                <p className="text-xl md:text-2xl font-bold text-green-700">
                  ₹{overallTotals.totalAmountRealized.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 md:w-12 h-10 md:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Total Outstanding/Pending Balance</p>
                <p className="text-xl md:text-2xl font-bold text-red-700">
                  ₹{overallTotals.totalPendingCompanyBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Tenant Name, Owner, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tenant Financial Health Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Tenant Details
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  City
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Stock Received
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Stock Sold
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Net Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    Loading financial data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No tenants found matching your search
                  </td>
                </tr>
              ) : (
                filteredData.map((distributor) => {
                  const showProfit = distributor.totalDistributorProfit >= 0
                  const profitOrPending = showProfit 
                    ? distributor.totalDistributorProfit 
                    : distributor.pendingCompanyBalance

                  return (
                    <tr key={distributor.distributorId} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{distributor.companyName}</p>
                          <p className="text-sm text-gray-600">{distributor.ownerName}</p>
                          <p className="text-xs text-gray-500 mt-1">{distributor.email}</p>
                          <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                            distributor.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {distributor.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{distributor.city || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-gray-700">
                          ₹{getNum(distributor.totalCompanyDebits).toLocaleString()}
                        </span>
                        <p className="text-xs text-gray-500">Cost to Tenant</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-gray-700">
                          ₹{getNum(distributor.totalAmountRealized).toLocaleString()}
                        </span>
                        <p className="text-xs text-gray-500">Retail Billing Total</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {showProfit ? (
                          <div>
                            <span className="text-lg font-bold text-green-700">
                              +₹{profitOrPending.toLocaleString()}
                            </span>
                            <p className="text-xs text-green-600 font-medium">Distributor Earned Profit</p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-lg font-bold text-red-700">
                              ₹{Math.abs(profitOrPending).toLocaleString()}
                            </span>
                            <p className="text-xs text-red-600 font-medium">Company Pending Amount</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default FinanceLedger
