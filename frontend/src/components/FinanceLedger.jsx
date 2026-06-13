import React, { useEffect, useState } from 'react'
import { 
  Package, 
  IndianRupee, 
  AlertCircle, 
  Search, 
  Users, 
  Building2,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ShieldAlert
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val) || 0
}

const formatCurrency = (val) => {
  const num = getNum(val)
  return `₹${num.toLocaleString('en-IN', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function FinanceLedger() {
  const [financialData, setFinancialData] = useState([])
  const [overallTotals, setOverallTotals] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedEntities, setExpandedEntities] = useState({})

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

  const toggleExpand = (entityId, isExpanded) => {
    setExpandedEntities(prev => ({
      ...prev,
      [entityId]: !isExpanded
    }))
  }

  const matchesSearch = (item) => {
    const term = searchTerm.toLowerCase()
    if (item.type === 'admin' || item.type === 'csa') {
      return item.name.toLowerCase().includes(term) || 
             item.email.toLowerCase().includes(term) ||
             (item.phone && item.phone.includes(term))
    } else if (item.type === 'unassigned' || item.companyName) {
      return (
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.companyName && item.companyName.toLowerCase().includes(term)) ||
        (item.ownerName && item.ownerName.toLowerCase().includes(term)) ||
        (item.email && item.email.toLowerCase().includes(term)) ||
        (item.phone && item.phone.includes(term))
      )
    }
    return false
  }

  const hasMatchingChildren = (group) => {
    if (group.csas && group.csas.some(csa => matchesSearch(csa) || csa.distributors.some(matchesSearch))) {
      return true
    }
    if (group.unassignedDistributors && group.unassignedDistributors.some(matchesSearch)) {
      return true
    }
    if (group.distributors && group.distributors.some(matchesSearch)) {
      return true
    }
    return false
  }

  const SummaryCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-500 flex-grow">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )

  const EntitySummaryRow = ({ entity, type, indent = 0, showExpand = true }) => {
    const entityId = `${type}-${entity.id || entity.name}`
    const isExpanded = !!expandedEntities[entityId]
    const showProfit = entity.totals && entity.totals.totalDistributorProfit >= 0
    const colorClass = type === 'admin' ? 'from-blue-50 to-indigo-50' : 
                      type === 'csa' ? 'from-cyan-50 to-teal-50' : 
                      'from-gray-50 to-gray-100'
    const iconClass = type === 'admin' ? 'from-blue-600 to-indigo-700' : 
                      type === 'csa' ? 'from-cyan-600 to-teal-700' : 
                      'from-gray-400 to-gray-600'

    return (
      <>
        <tr className={`bg-gradient-to-r ${colorClass}`}>
          <td className="px-6 py-5" style={{paddingLeft: `${24 + indent * 24}px`}}>
            <div className="flex items-center gap-3">
              {showExpand && (
                <button 
                  onClick={() => toggleExpand(entityId, isExpanded)}
                  className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                >
                  {isExpanded ? <ChevronDown size={20} className="text-gray-600" /> : <ChevronRight size={20} className="text-gray-600" />}
                </button>
              )}
              <div className={`w-10 h-10 bg-gradient-to-br ${iconClass} rounded-full flex items-center justify-center flex-shrink-0`}>
                {type === 'distributor' ? <Building2 size={18} className="text-white" /> : <Users size={18} className="text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">
                    {entity.name || entity.companyName}
                  </p>
                  {entity.isActive !== undefined && (
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      entity.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {entity.isActive ? 'Active' : 'Suspended'}
                    </span>
                  )}
                </div>
                {entity.email && <p className="text-sm text-gray-500">{entity.email}</p>}
                {entity.phone && <p className="text-xs text-gray-400">{entity.phone}</p>}
              </div>
            </div>
          </td>
          <td className="px-6 py-5">
            {entity.city && <span className="text-gray-600">{entity.city}</span>}
          </td>
          <td className="px-6 py-5 text-right">
            <div>
              <span className="font-semibold text-gray-900">
                {formatCurrency(entity.totals?.totalCompanyDebits || entity.totalCompanyDebits)}
              </span>
              <p className="text-xs text-gray-400">Stock Received</p>
            </div>
          </td>
          <td className="px-6 py-5 text-right">
            <div>
              <span className="font-semibold text-gray-900">
                {formatCurrency(entity.totals?.totalAmountRealized || entity.totalAmountRealized)}
              </span>
              <p className="text-xs text-gray-400">Sales</p>
            </div>
          </td>
          <td className="px-6 py-5 text-right">
            {showProfit ? (
              <div>
                <span className="text-lg font-bold text-green-600">
                  +{formatCurrency(entity.totals?.totalDistributorProfit || entity.totalDistributorProfit)}
                </span>
                <p className="text-xs text-green-500 font-medium">Net Profit</p>
              </div>
            ) : (
              <div>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(Math.abs(entity.totals?.totalPendingCompanyBalance || entity.pendingCompanyBalance))}
                </span>
                <p className="text-xs text-red-500 font-medium">Pending</p>
              </div>
            )}
          </td>
        </tr>
        {isExpanded && entity.totals && (
          <tr className="bg-gray-50">
            <td colSpan="5" className="px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Stock Cost</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(entity.totals.totalStockCost)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Sales Returns</p>
                  <p className="text-sm font-semibold text-orange-600">{formatCurrency(entity.totals.totalSalesReturns)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Purchase Returns</p>
                  <p className="text-sm font-semibold text-orange-600">{formatCurrency(entity.totals.totalPurchaseReturns)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Payments In</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(entity.totals.totalPaymentsIn)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Payments Out</p>
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(entity.totals.totalPaymentsOut)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Pending Claims</p>
                  <p className="text-sm font-semibold text-purple-600">{formatCurrency(entity.totals.totalPendingClaims)}</p>
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    )
  }

  const DistributorRow = ({ distributor, indent = 0 }) => {
    const entityId = `distributor-${distributor.distributorId}`
    const isExpanded = !!expandedEntities[entityId]
    const showProfit = distributor.totalDistributorProfit >= 0

    return (
      <>
        <tr className="hover:bg-blue-50 transition-colors">
          <td className="px-6 py-4" style={{paddingLeft: `${24 + indent * 24}px`}}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => toggleExpand(entityId, isExpanded)}
                className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
              >
                {isExpanded ? <ChevronDown size={20} className="text-gray-600" /> : <ChevronRight size={20} className="text-gray-600" />}
              </button>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{distributor.companyName}</p>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    distributor.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {distributor.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{distributor.ownerName}</p>
                <p className="text-xs text-gray-400">{distributor.email} • {distributor.phone}</p>
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <span className="text-gray-600">{distributor.city || '-'}</span>
          </td>
          <td className="px-6 py-4 text-right">
            <div>
              <span className="font-medium text-gray-700">{formatCurrency(distributor.totalCompanyDebits)}</span>
              <p className="text-xs text-gray-400">Stock Received</p>
            </div>
          </td>
          <td className="px-6 py-4 text-right">
            <div>
              <span className="font-medium text-gray-700">{formatCurrency(distributor.totalAmountRealized)}</span>
              <p className="text-xs text-gray-400">Sales</p>
            </div>
          </td>
          <td className="px-6 py-4 text-right">
            {showProfit ? (
              <div>
                <span className="text-lg font-bold text-green-600">+{formatCurrency(distributor.totalDistributorProfit)}</span>
                <p className="text-xs text-green-500 font-medium">Net Profit</p>
              </div>
            ) : (
              <div>
                <span className="text-lg font-bold text-red-600">{formatCurrency(Math.abs(distributor.pendingCompanyBalance))}</span>
                <p className="text-xs text-red-500 font-medium">Pending</p>
              </div>
            )}
          </td>
        </tr>
        {isExpanded && (
          <tr className="bg-gray-50">
            <td colSpan="5" className="px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Stock Cost</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(distributor.totalStockCost)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Sales Returns</p>
                  <p className="text-sm font-semibold text-orange-600">{formatCurrency(distributor.totalSalesReturns)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Purchase Returns</p>
                  <p className="text-sm font-semibold text-orange-600">{formatCurrency(distributor.totalPurchaseReturns)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Payments In</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(distributor.totalPaymentsIn)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Payments Out</p>
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(distributor.totalPaymentsOut)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Claims</p>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-purple-600">Pending: {formatCurrency(distributor.totalPendingClaims)}</span>
                    <span className="text-xs font-semibold text-blue-600">Approved: {formatCurrency(distributor.totalApprovedClaims)}</span>
                    <span className="text-xs font-semibold text-green-600">Paid: {formatCurrency(distributor.totalPaidClaims)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <FileText size={16} className="text-blue-500 mb-1" />
                  <p className="text-xs text-gray-500">Invoices</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.invoiceCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <Package size={16} className="text-purple-500 mb-1" />
                  <p className="text-xs text-gray-500">Purchases</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.purchaseCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <ArrowUpRight size={16} className="text-orange-500 mb-1" />
                  <p className="text-xs text-gray-500">Sales Returns</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.salesReturnCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <ArrowDownRight size={16} className="text-orange-500 mb-1" />
                  <p className="text-xs text-gray-500">Purchase Returns</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.purchaseReturnCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <CreditCard size={16} className="text-green-500 mb-1" />
                  <p className="text-xs text-gray-500">Payments In</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.paymentInCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <CreditCard size={16} className="text-red-500 mb-1" />
                  <p className="text-xs text-gray-500">Payments Out</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.paymentOutCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <Users size={16} className="text-cyan-500 mb-1" />
                  <p className="text-xs text-gray-500">Parties</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.partyCount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <Package size={16} className="text-amber-500 mb-1" />
                  <p className="text-xs text-gray-500">Products</p>
                  <p className="text-lg font-bold text-gray-900">{distributor.productCount}</p>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-400 flex items-center gap-4">
                <span>Created: {formatDate(distributor.createdAt)}</span>
                {distributor.updatedAt && <span>Last Update: {formatDate(distributor.updatedAt)}</span>}
              </div>
            </td>
          </tr>
        )}
      </>
    )
  }

  const renderGroup = (group, indent = 0) => {
    if (!matchesSearch(group) && !hasMatchingChildren(group)) return null

    return (
      <React.Fragment key={group.id || group.name}>
        {group.type !== 'unassigned' && (
          <EntitySummaryRow 
            entity={group} 
            type={group.type} 
            indent={indent} 
          />
        )}
        {group.csas && group.csas.map(csa => {
          if (!matchesSearch(csa) && !csa.distributors.some(matchesSearch)) return null
          return (
            <React.Fragment key={csa.id}>
              <EntitySummaryRow 
                entity={csa} 
                type="csa" 
                indent={indent + 1} 
              />
              {csa.distributors.map(dist => matchesSearch(dist) && <DistributorRow key={dist.distributorId} distributor={dist} indent={indent + 2} />)}
            </React.Fragment>
          )
        })}
        {group.unassignedDistributors && group.unassignedDistributors.map(dist => matchesSearch(dist) && <DistributorRow key={dist.distributorId} distributor={dist} indent={indent + 1} />)}
        {group.distributors && group.distributors.map(dist => matchesSearch(dist) && <DistributorRow key={dist.distributorId} distributor={dist} indent={indent + 1} />)}
      </React.Fragment>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Control Ledger</h1>
          <p className="text-gray-600">Complete financial overview of all distributors and CSAs</p>
        </div>
        <button 
          onClick={fetchFinancialData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {overallTotals && (
        <>
          {/* Top Level Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard 
              title="Total Admins" 
              value={Number(overallTotals.totalAdmins) || 0} 
              icon={Users}
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <SummaryCard 
              title="Total CSAs" 
              value={Number(overallTotals.totalCsas) || 0} 
              icon={Users}
              color="bg-gradient-to-br from-cyan-500 to-teal-600"
            />
            <SummaryCard 
              title="Total Distributors" 
              value={Number(overallTotals.totalDistributors) || 0} 
              icon={Building2}
              color="bg-gradient-to-br from-purple-500 to-pink-600"
            />
            <SummaryCard 
              title="Total Stock Value" 
              value={formatCurrency(overallTotals.totalCompanyDebits)} 
              icon={Package}
              color="bg-gradient-to-br from-orange-500 to-amber-600"
            />
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard 
              title="Total Sales" 
              value={formatCurrency(overallTotals.totalAmountRealized)} 
              icon={IndianRupee}
              color="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            <SummaryCard 
              title="Total Outstanding" 
              value={formatCurrency(overallTotals.totalPendingCompanyBalance)} 
              icon={ShieldAlert}
              color="bg-gradient-to-br from-red-500 to-rose-600"
            />
            <SummaryCard 
              title="Total Profit" 
              value={formatCurrency(overallTotals.totalDistributorProfit)} 
              icon={TrendingUp}
              color="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <SummaryCard 
              title="Total Payments In" 
              value={formatCurrency(overallTotals.totalPaymentsIn)} 
              icon={CreditCard}
              color="bg-gradient-to-br from-teal-500 to-cyan-600"
            />
          </div>
          
          {/* Third Row of Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard 
              title="Total Payments Out" 
              value={formatCurrency(overallTotals.totalPaymentsOut)} 
              icon={CreditCard}
              color="bg-gradient-to-br from-rose-500 to-pink-600"
            />
            <SummaryCard 
              title="Total Pending Claims" 
              value={formatCurrency(overallTotals.totalPendingClaims)} 
              icon={AlertCircle}
              color="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <SummaryCard 
              title="Total Sales Returns" 
              value={formatCurrency(overallTotals.totalSalesReturns)} 
              icon={ArrowUpRight}
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <SummaryCard 
              title="Total Purchase Returns" 
              value={formatCurrency(overallTotals.totalPurchaseReturns)} 
              icon={ArrowDownRight}
              color="bg-gradient-to-br from-slate-500 to-gray-600"
            />
          </div>
        </>
      )}

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Admin, CSA, Distributor name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Tenant Financial Health Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-1/3">
                  Entity Details
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  City
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Stock Received
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Total Sales
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Net Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-blue-500" />
                    Loading financial data...
                  </td>
                </tr>
              ) : financialData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                financialData.map(group => renderGroup(group))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default FinanceLedger
