import storage from '../utils/storage'
import { useState, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (amount) => {
  return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function SuperAdminPurchaseRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewRequest, setViewRequest] = useState(null)
  
  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/superadmin/purchase-requests/csa`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (err) {
      console.error('Failed to fetch purchase requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this request? This will instantly increase the stock for the CSA.')) return
    
    try {
      const res = await fetch(`${API_URL}/superadmin/purchase-requests/csa/${id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        alert('Order approved successfully and stock updated.')
        fetchRequests()
        setViewRequest(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve request')
      }
    } catch (err) {
      console.error('Approve failed:', err)
      alert('An error occurred while approving')
    }
  }

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this request?')) return
    
    try {
      const res = await fetch(`${API_URL}/superadmin/purchase-requests/csa/${id}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        alert('Order rejected.')
        fetchRequests()
        setViewRequest(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject request')
      }
    } catch (err) {
      console.error('Reject failed:', err)
      alert('An error occurred while rejecting')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>
      case 'PENDING': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>
      case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CSA Purchase Requests</h1>
          <p className="text-sm text-gray-500">Review and approve purchase orders from CSAs.</p>
        </div>
        <button
          onClick={fetchRequests}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Req No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No requests found.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.invoiceNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.csa ? `${r.csa.name} (${r.csa.city})` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.supplierName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(r.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setViewRequest(r)} className="text-indigo-600 hover:text-indigo-900">
                        <Eye className="w-5 h-5 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewRequest && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Review Purchase Request
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Req No: {viewRequest.invoiceNo} | Date: {new Date(viewRequest.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setViewRequest(null)} className="text-gray-400 hover:text-gray-500">
                &times;
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">CSA Name</h3>
                  <p className="mt-1 text-lg text-gray-900">{viewRequest.csa?.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Supplier</h3>
                  <p className="mt-1 text-lg text-gray-900">{viewRequest.supplierName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">{getStatusBadge(viewRequest.status)}</div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Requested Items</h4>
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewRequest.purchaseItems?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product?.name || 'Unknown Product'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.qty}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.rate || item.costPrice)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-medium text-gray-900 bg-gray-50">Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600 bg-gray-50">{formatCurrency(viewRequest.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {viewRequest.status === 'PENDING' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                <button onClick={() => handleReject(viewRequest.id)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reject Request</button>
                <button onClick={() => handleApprove(viewRequest.id)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Approve & Update Stock</button>
              </div>
            )}
            {viewRequest.status !== 'PENDING' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-lg">
                <button onClick={() => setViewRequest(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminPurchaseRequests
