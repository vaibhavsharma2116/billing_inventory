import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Phone, CreditCard, Activity, Tag, FileText } from 'lucide-react'
import storage from '../utils/storage'

const BASE_API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '₹0.00'
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function PartyProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [party, setParty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPartyDetails()
  }, [id])

  const fetchPartyDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BASE_API_URL}/parties/${id}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch party details')
      const data = await res.json()
      setParty(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !party) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error || 'Party not found'}
        </div>
        <button
          onClick={() => navigate('/parties')}
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Customer Master
        </button>
      </div>
    )
  }

  const getNum = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const totalSales = party.invoices?.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0) || 0
  const totalSalesReturns = party.salesReturns?.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0) || 0
  const totalPaymentsReceived = party.paymentsIn?.reduce((sum, pi) => sum + getNum(pi.amount), 0) || 0
  const outstandingBalance = (totalSales - totalSalesReturns) - totalPaymentsReceived

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/parties')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
            <p className="text-gray-500 mt-1">Customer Profile</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Account Details */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="text-blue-600" size={20} />
            Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <div className="text-sm text-gray-500 mb-1">Company Name</div>
              <div className="font-medium text-gray-900">{party.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Phone</div>
              <div className="font-medium text-gray-900">{party.phone || 'N/A'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500 mb-1">Address</div>
              <div className="font-medium text-gray-900">{party.address || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="text-purple-600" size={20} />
            Business Details
          </h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">GSTIN Number</div>
              <div className="font-medium text-gray-900">{party.gstin || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Credit Limit</div>
              <div className="font-medium text-gray-900">{party.creditLimit ? formatCurrency(party.creditLimit) : 'No Limit'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Margin (%)</div>
              <div className="font-medium text-gray-900">{party.margin ? `${party.margin}%` : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Activity className="text-green-600" size={20} />
          Performance Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Total Sales</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(totalSales)}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Total Payments Received</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(totalPaymentsReceived)}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Current Outstanding Balance</div>
            <div className={`text-xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(outstandingBalance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PartyProfile
