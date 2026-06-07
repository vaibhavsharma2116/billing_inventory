import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Package, IndianRupee, AlertCircle, RefreshCw, CreditCard, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react'
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

const API_URL = import.meta.env.VITE_API_URL

// Register Chart.js components
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

function Dashboard() {
  const navigate = useNavigate()
  const [parties, setParties] = useState(0)
  const [products, setProducts] = useState(0)
  const [invoices, setInvoices] = useState([])
  const [salesReturns, setSalesReturns] = useState([])
  const [paymentsIn, setPaymentsIn] = useState([])
  const [claims, setClaims] = useState([])
  const [purchaseReturns, setPurchaseReturns] = useState([])
  const [paymentsOut, setPaymentsOut] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Admin User')
  const [activeTab, setActiveTab] = useState('invoices')
  const [activeModal, setActiveModal] = useState(null) // 'pendingPayments', 'paymentsReceived', 'salesReturns', 'purchaseReturns', 'paymentsOut'
  const [allParties, setAllParties] = useState([]) // Store all parties for reference

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserName(user.name || 'Admin User')
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const promises = []
      promises.push(fetch(`${API_URL}/parties`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/products`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/products?lowStock=true`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/invoices`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/sales-returns`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/payments-in`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/claims`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/purchase-returns`, { headers: getAuthHeaders() }).catch(() => null))
      promises.push(fetch(`${API_URL}/payments-out`, { headers: getAuthHeaders() }).catch(() => null))

      const [partiesRes, productsRes, lowStockRes, invoicesRes, salesReturnsRes, paymentsInRes, claimsRes, purchaseReturnsRes, paymentsOutRes] = await Promise.all(promises)
      
      console.log('Purchase returns res:', purchaseReturnsRes)
      console.log('Payments out res:', paymentsOutRes)
      
      if (partiesRes?.ok) {
        const data = await partiesRes.json()
        setAllParties(Array.isArray(data) ? data : [])
        setParties(Array.isArray(data) ? data.length : 0)
      }
      
      if (productsRes?.ok) {
        const data = await productsRes.json()
        setProducts(Array.isArray(data) ? data.length : 0)
      }

      if (lowStockRes?.ok) {
        const data = await lowStockRes.json()
        setLowStockProducts(Array.isArray(data) ? data : [])
      }
      
      if (invoicesRes?.ok) {
        const data = await invoicesRes.json()
        setInvoices(Array.isArray(data) ? data : [])
      }
      
      if (salesReturnsRes?.ok) {
        const data = await salesReturnsRes.json()
        setSalesReturns(Array.isArray(data) ? data : [])
      }
      
      if (paymentsInRes?.ok) {
        const data = await paymentsInRes.json()
        setPaymentsIn(Array.isArray(data) ? data : [])
      }
      
      if (claimsRes?.ok) {
        const data = await claimsRes.json()
        setClaims(Array.isArray(data) ? data.slice(0, 5) : [])
      }
      
      if (purchaseReturnsRes?.ok) {
        const data = await purchaseReturnsRes.json()
        console.log('Purchase returns data:', data)
        setPurchaseReturns(Array.isArray(data) ? data : [])
      }
      
      if (paymentsOutRes?.ok) {
        const data = await paymentsOutRes.json()
        console.log('Payments out data:', data)
        setPaymentsOut(Array.isArray(data) ? data : [])
      }
      
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getGrandTotal = (inv) => {
    try {
      console.log('getGrandTotal inv:', inv)
      if (typeof inv?.grandTotal === 'number') return inv.grandTotal
      if (inv?.grandTotal?.toNumber) return inv.grandTotal.toNumber()
      if (typeof inv?.grandTotal === 'string' && !isNaN(parseFloat(inv.grandTotal))) return parseFloat(inv.grandTotal)
      return 0
    } catch { return 0 }
  }

  const getClaimAmount = (claim) => {
    try {
      if (typeof claim?.amount === 'number') return claim.amount
      if (claim?.amount?.toNumber) return claim.amount.toNumber()
      if (typeof claim?.amount === 'string' && !isNaN(parseFloat(claim.amount))) return parseFloat(claim.amount)
      return 0
    } catch { return 0 }
  }

  const getSalesReturnTotal = (sr) => {
    try {
      if (typeof sr?.grandTotal === 'number') return sr.grandTotal
      if (sr?.grandTotal?.toNumber) return sr.grandTotal.toNumber()
      if (typeof sr?.grandTotal === 'string' && !isNaN(parseFloat(sr.grandTotal))) return parseFloat(sr.grandTotal)
      return 0
    } catch { return 0 }
  }

  const getPaymentAmount = (payment) => {
    try {
      if (typeof payment?.amount === 'number') return payment.amount
      if (payment?.amount?.toNumber) return payment.amount.toNumber()
      if (typeof payment?.amount === 'string' && !isNaN(parseFloat(payment.amount))) return parseFloat(payment.amount)
      return 0
    } catch { return 0 }
  }
  
  const getPurchaseReturnTotal = (pr) => {
    try {
      if (typeof pr?.grandTotal === 'number') return pr.grandTotal
      if (pr?.grandTotal?.toNumber) return pr.grandTotal.toNumber()
      if (typeof pr?.grandTotal === 'string' && !isNaN(parseFloat(pr.grandTotal))) return parseFloat(pr.grandTotal)
      return 0
    } catch { return 0 }
  }

  // Party-wise calculations
  const calculatePartyWiseInvoices = () => {
    const partyTotals = {}
    invoices.forEach(inv => {
      const partyName = inv?.party?.name || 'Unknown Party'
      if (!partyTotals[partyName]) partyTotals[partyName] = 0
      partyTotals[partyName] += getGrandTotal(inv)
    })
    return Object.entries(partyTotals).map(([name, total]) => ({ name, total }))
  }

  const calculatePartyWiseSalesReturns = () => {
    const partyTotals = {}
    salesReturns.forEach(sr => {
      const partyName = sr?.party?.name || 'Unknown Party'
      if (!partyTotals[partyName]) partyTotals[partyName] = 0
      partyTotals[partyName] += getSalesReturnTotal(sr)
    })
    return Object.entries(partyTotals).map(([name, total]) => ({ name, total }))
  }

  const calculatePartyWisePaymentsIn = () => {
    const partyTotals = {}
    paymentsIn.forEach(p => {
      const partyName = p?.party?.name || 'Unknown Party'
      if (!partyTotals[partyName]) partyTotals[partyName] = 0
      partyTotals[partyName] += getPaymentAmount(p)
    })
    return Object.entries(partyTotals).map(([name, total]) => ({ name, total }))
  }

  const calculatePartyWisePending = () => {
    const invoiceTotals = {}
    const returnTotals = {}
    const paymentTotals = {}

    invoices.forEach(inv => {
      const name = inv?.party?.name || 'Unknown Party'
      if (!invoiceTotals[name]) invoiceTotals[name] = 0
      invoiceTotals[name] += getGrandTotal(inv)
    })

    salesReturns.forEach(sr => {
      const name = sr?.party?.name || 'Unknown Party'
      if (!returnTotals[name]) returnTotals[name] = 0
      returnTotals[name] += getSalesReturnTotal(sr)
    })

    paymentsIn.forEach(p => {
      const name = p?.party?.name || 'Unknown Party'
      if (!paymentTotals[name]) paymentTotals[name] = 0
      paymentTotals[name] += getPaymentAmount(p)
    })

    const allNames = new Set([
      ...Object.keys(invoiceTotals),
      ...Object.keys(returnTotals),
      ...Object.keys(paymentTotals)
    ])

    const pendingData = []
    allNames.forEach(name => {
      const totalInvoice = invoiceTotals[name] || 0
      const totalReturn = returnTotals[name] || 0
      const totalPayment = paymentTotals[name] || 0
      const pending = Math.max(0, (totalInvoice - totalReturn) - totalPayment)
      if (pending > 0) {
        pendingData.push({ name, pending })
      }
    })

    return pendingData
  }

  const calculateSupplierWisePurchaseReturns = () => {
    const supplierTotals = {}
    purchaseReturns.forEach(pr => {
      const supplierName = pr?.supplierName || 'Unknown Supplier'
      if (!supplierTotals[supplierName]) supplierTotals[supplierName] = 0
      supplierTotals[supplierName] += getPurchaseReturnTotal(pr)
    })
    return Object.entries(supplierTotals).map(([name, total]) => ({ name, total }))
  }

  const calculateSupplierWisePaymentsOut = () => {
    const supplierTotals = {}
    paymentsOut.forEach(p => {
      const supplierName = p?.supplierName || 'Unknown Supplier'
      if (!supplierTotals[supplierName]) supplierTotals[supplierName] = 0
      supplierTotals[supplierName] += getPaymentAmount(p)
    })
    return Object.entries(supplierTotals).map(([name, total]) => ({ name, total }))
  }

  const totalInvoices = invoices.reduce((sum, inv) => sum + getGrandTotal(inv), 0)
  const totalSalesReturns = salesReturns.reduce((sum, sr) => sum + getSalesReturnTotal(sr), 0)
  const totalRevenue = totalInvoices - totalSalesReturns
  const totalPaymentsReceived = paymentsIn.reduce((sum, p) => sum + getPaymentAmount(p), 0)
  const pendingPayments = Math.max(0, totalRevenue - totalPaymentsReceived) // Ensure it's not negative
  const pendingClaims = claims.filter(c => c?.status === 'PENDING').length
  const totalPurchaseReturns = purchaseReturns.reduce((sum, pr) => sum + getPurchaseReturnTotal(pr), 0)
  const totalPaymentsOut = paymentsOut.reduce((sum, p) => sum + getPaymentAmount(p), 0)
  
  console.log('Dashboard values:')
  console.log('totalInvoices:', totalInvoices)
  console.log('totalSalesReturns:', totalSalesReturns)
  console.log('totalRevenue:', totalRevenue)
  console.log('totalPaymentsReceived:', totalPaymentsReceived)
  console.log('pendingPayments:', pendingPayments)

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen pt-0 md:pt-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          Dashboard <span className="text-xs md:text-sm text-pink-500 font-semibold bg-pink-100 px-2 md:px-3 py-1 rounded-full">ONLINE</span>
        </h1>
      </div>

      {/* Welcome Card */}
      <div className="mb-6 md:mb-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <p className="text-pink-100 text-sm md:text-lg mb-1 md:mb-2">Good morning,</p>
            <h2 className="text-2xl md:text-4xl font-bold">{userName}</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-full backdrop-blur-sm">
            <span className="text-sm">PERFORMANCE</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6 md:mb-8 bg-red-50 border border-red-200 rounded-2xl md:rounded-3xl p-4 md:p-6 cursor-pointer" onClick={() => navigate('/inventory')}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-red-800">Low Stock Alert!</h3>
              <p className="text-sm text-red-600">{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((product) => (
              <div key={product.id} className="bg-white rounded-xl p-3 border border-red-100">
                <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                <p className="text-sm text-red-600">Stock: {product.currentStock}</p>
                {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
              </div>
            ))}
          </div>
          {lowStockProducts.length > 6 && (
            <p className="text-sm text-red-600 mt-3">+{lowStockProducts.length - 6} more low stock items</p>
          )}
        </div>
      )}

      {/* Stats Grid - Core Stats */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Core Stats</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {/* Total Parties */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/parties')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Users size={20} className="md:w-8 md:h-8 text-blue-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total Parties</p>
              <p className="text-xl md:text-3xl font-bold text-blue-600 mt-2">{loading ? '...' : parties}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Products in Stock */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/inventory')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Package size={20} className="md:w-8 md:h-8 text-orange-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Products in Stock</p>
              <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">{loading ? '...' : products}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/reports')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <IndianRupee size={20} className="md:w-8 md:h-8 text-yellow-700" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total Revenue</p>
              <p className="text-xl md:text-3xl font-bold text-yellow-700 mt-2">₹{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Billing/Sales */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Billing & Sales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {/* Payments Received */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => setActiveModal('paymentsReceived')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <CreditCard size={20} className="md:w-8 md:h-8 text-green-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Received</p>
              <p className="text-xl md:text-3xl font-bold text-green-600 mt-2">₹{totalPaymentsReceived.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Sales Returns */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => setActiveModal('salesReturns')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <RefreshCw size={20} className="md:w-8 md:h-8 text-red-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Sales Returns</p>
              <p className="text-xl md:text-3xl font-bold text-red-600 mt-2">₹{totalSalesReturns.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => setActiveModal('pendingPayments')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <IndianRupee size={20} className="md:w-8 md:h-8 text-orange-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Pending Payments</p>
              <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">₹{pendingPayments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Purchase */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Purchase</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          {/* Payments Out */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => setActiveModal('paymentsOut')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-rose-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <ArrowRightCircle size={20} className="md:w-8 md:h-8 text-rose-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Out</p>
              <p className="text-xl md:text-3xl font-bold text-rose-600 mt-2">₹{totalPaymentsOut.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>

          {/* Purchase Returns */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => setActiveModal('purchaseReturns')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <ArrowLeftCircle size={20} className="md:w-8 md:h-8 text-cyan-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Purchase Returns</p>
              <p className="text-xl md:text-3xl font-bold text-cyan-600 mt-2">₹{totalPurchaseReturns.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Claims */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Claims</h3>
        <div className="grid grid-cols-1 gap-3 md:gap-6 max-w-sm">
          {/* Pending Claims */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => navigate('/claims')}>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <AlertCircle size={20} className="md:w-8 md:h-8 text-purple-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Pending Claims</p>
              <p className="text-xl md:text-3xl font-bold text-purple-600 mt-2">{loading ? '...' : pendingClaims}</p>
              <p className="text-xs text-gray-500 mt-1">Click for details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphical Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Chart 1: Sales & Returns */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-medium text-gray-700 mb-4">Sales & Returns</h3>
          <Bar
            data={{
              labels: ['Invoices', 'Sales Returns', 'Purchase Returns'],
              datasets: [
                {
                  data: [totalInvoices, totalSalesReturns, totalPurchaseReturns],
                  backgroundColor: ['#4f46e5', '#ef4444', '#0ea5e9'],
                  borderRadius: 4
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

        {/* Chart 2: Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-medium text-gray-700 mb-4">Revenue & Payments</h3>
          <Line
            data={{
              labels: ['Total', 'Received', 'Pending'],
              datasets: [
                {
                  data: [totalRevenue, totalPaymentsReceived, pendingPayments],
                  borderColor: '#4f46e5',
                  tension: 0.3,
                  pointRadius: 4
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
        
        {/* Chart 3: Payments */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-medium text-gray-700 mb-4">Payments</h3>
          <div className="max-w-xs mx-auto">
            <Doughnut
              data={{
                labels: ['Received', 'Out'],
                datasets: [
                  {
                    data: [totalPaymentsReceived, totalPaymentsOut],
                    backgroundColor: ['#22c55e', '#ef4444']
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

        {/* Chart 4: Claims */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-medium text-gray-700 mb-4">Claims</h3>
          <div className="max-w-xs mx-auto">
            <Doughnut
              data={{
                labels: ['Pending', 'Approved', 'Paid'],
                datasets: [
                  {
                    data: [
                      claims.filter(c => c?.status === 'PENDING').length,
                      claims.filter(c => c?.status === 'APPROVED').length,
                      claims.filter(c => c?.status === 'PAID').length
                    ],
                    backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e']
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

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex min-w-max">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base whitespace-nowrap transition-all ${
                activeTab === 'invoices' 
                  ? 'bg-pink-50 text-pink-700 border-b-2 border-pink-600' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Recent Invoices
            </button>
            <button
              onClick={() => setActiveTab('purchaseReturns')}
              className={`px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base whitespace-nowrap transition-all ${
                activeTab === 'purchaseReturns' 
                  ? 'bg-cyan-50 text-cyan-700 border-b-2 border-cyan-600' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Recent Purchase Returns
            </button>
            <button
              onClick={() => setActiveTab('paymentsOut')}
              className={`px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base whitespace-nowrap transition-all ${
                activeTab === 'paymentsOut' 
                  ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-600' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Recent Payments Out
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base whitespace-nowrap transition-all ${
                activeTab === 'claims' 
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Recent Claims
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-8">
          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            !Array.isArray(invoices) || invoices.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-gray-500">No invoices yet</div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {invoices.map((inv, i) => (
                  <div key={inv?.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl md:rounded-2xl hover:bg-pink-50 transition-colors gap-2">
                    <div>
                      <div className="font-semibold text-gray-900">{inv?.invoiceNo || '-'}</div>
                      <div className="text-sm text-gray-600">{inv?.party?.name || 'Unknown Party'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-pink-600">₹{getGrandTotal(inv).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {inv?.date ? new Date(inv.date).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Purchase Returns Tab */}
          {activeTab === 'purchaseReturns' && (
            !Array.isArray(purchaseReturns) || purchaseReturns.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-gray-500">No purchase returns yet</div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {purchaseReturns.slice(0,5).map((pr, i) => (
                  <div key={pr?.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl md:rounded-2xl hover:bg-cyan-50 transition-colors gap-2">
                    <div>
                      <div className="font-semibold text-gray-900">{pr?.returnNo || '-'}</div>
                      <div className="text-sm text-gray-600">{pr?.supplierName || 'Unknown Supplier'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-600">₹{getPurchaseReturnTotal(pr).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {pr?.createdAt ? new Date(pr.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Payments Out Tab */}
          {activeTab === 'paymentsOut' && (
            !Array.isArray(paymentsOut) || paymentsOut.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-gray-500">No payments out yet</div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {paymentsOut.slice(0,5).map((p, i) => (
                  <div key={p?.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl md:rounded-2xl hover:bg-rose-50 transition-colors gap-2">
                    <div>
                      <div className="font-semibold text-gray-900">{p?.paymentNo || '-'}</div>
                      <div className="text-sm text-gray-600">{p?.supplierName || 'Unknown Supplier'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-600">₹{getPaymentAmount(p).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Claims Tab */}
          {activeTab === 'claims' && (
            !Array.isArray(claims) || claims.length === 0 ? (
              <div className="text-center py-8 md:py-12 text-gray-500">No claims yet</div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {claims.slice(0,5).map((claim, i) => (
                  <div key={claim?.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl md:rounded-2xl hover:bg-purple-50 transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{claim?.brandName || '-'}</div>
                      <div className="text-sm text-gray-600 truncate">{claim?.claimDetails || '-'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="font-bold text-purple-600">₹{getClaimAmount(claim).toFixed(2)}</div>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        claim?.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        claim?.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {claim?.status || 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal Component */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {activeModal === 'pendingPayments' && 'Pending Payments by Party'}
                {activeModal === 'paymentsReceived' && 'Payments Received by Party'}
                {activeModal === 'salesReturns' && 'Sales Returns by Party'}
                {activeModal === 'purchaseReturns' && 'Purchase Returns by Supplier'}
                {activeModal === 'paymentsOut' && 'Payments Out by Supplier'}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            <div className="p-6">
              {activeModal === 'pendingPayments' && (
                <div className="space-y-3">
                  {(() => {
                    const data = calculatePartyWisePending()
                    if (data.length === 0) return <div className="text-center text-gray-500 py-8">No pending payments</div>
                    return data.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="font-bold text-orange-600">₹{item.pending.toFixed(2)}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {activeModal === 'paymentsReceived' && (
                <div className="space-y-3">
                  {(() => {
                    const data = calculatePartyWisePaymentsIn()
                    if (data.length === 0) return <div className="text-center text-gray-500 py-8">No payments received</div>
                    return data.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="font-bold text-green-600">₹{item.total.toFixed(2)}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {activeModal === 'salesReturns' && (
                <div className="space-y-3">
                  {(() => {
                    const data = calculatePartyWiseSalesReturns()
                    if (data.length === 0) return <div className="text-center text-gray-500 py-8">No sales returns</div>
                    return data.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="font-bold text-red-600">₹{item.total.toFixed(2)}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {activeModal === 'purchaseReturns' && (
                <div className="space-y-3">
                  {(() => {
                    const data = calculateSupplierWisePurchaseReturns()
                    if (data.length === 0) return <div className="text-center text-gray-500 py-8">No purchase returns</div>
                    return data.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="font-bold text-cyan-600">₹{item.total.toFixed(2)}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {activeModal === 'paymentsOut' && (
                <div className="space-y-3">
                  {(() => {
                    const data = calculateSupplierWisePaymentsOut()
                    if (data.length === 0) return <div className="text-center text-gray-500 py-8">No payments out</div>
                    return data.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="font-bold text-rose-600">₹{item.total.toFixed(2)}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
