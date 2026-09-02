import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, User, Phone, Mail, MapPin, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react'
import storage from '../utils/storage'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0)
}

function CSACustomerProfile() {
  const { distributorId } = useParams()
  const navigate = useNavigate()
  const [distributor, setDistributor] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDistributorData()
  }, [distributorId])

  const fetchDistributorData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/csa/distributors/${distributorId}`, {
        headers: getAuthHeaders()
      })

      if (res.ok) {
        const data = await res.json()
        setDistributor(data)
      } else {
        console.error('Failed to fetch distributor')
      }
    } catch (error) {
      console.error('Failed to fetch distributor:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!distributor) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Building2 size={64} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700">Distributor Not Found</h2>
        <button 
          onClick={() => navigate('/csa/customer-master')}
          className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={() => navigate('/csa/customer-master')}
          className="p-2 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-cyan-600" size={28} />
            {distributor.companyName}
          </h1>
          <p className="text-gray-500 mt-1">Distributor Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Account Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Company Name</span>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {distributor.companyName}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Contact Person</span>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      {distributor.ownerName}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Status</span>
                    <div className="font-medium flex items-center gap-2">
                      {distributor.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Phone Number</span>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      {distributor.phone || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Email Address</span>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      {distributor.email || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">City / Location</span>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      {distributor.city || 'N/A'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Retailer Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <FileText size={20} className="text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-800">Business Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm text-gray-500 block mb-1">GSTIN Number</span>
                  <div className="font-medium text-gray-900 font-mono">
                    {distributor.gstIn || 'Not Provided'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block mb-1">Member Since</span>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {new Date(distributor.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Stats / Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Performance Overview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Total Sales</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(distributor.totalSales)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Total Payments Received</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(distributor.totalPaymentsIn)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Current Outstanding Balance</div>
                <div className={`text-xl font-bold ${distributor.pendingCompanyBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(distributor.pendingCompanyBalance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CSACustomerProfile
