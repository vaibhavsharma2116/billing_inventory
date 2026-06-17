import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, Eye, Trash2, X, RefreshCw, Download } from 'lucide-react'

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

const isEditable = (createdAt) => {
  const invoiceDate = new Date(createdAt)
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  return invoiceDate >= threeDaysAgo
}

function CSAMyInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewInvoice, setViewInvoice] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/invoices/my`, { headers: getAuthHeaders() })
      if (res.ok) {
        setInvoices(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (invoice) => {
    navigate(`/csa/my-billing?edit=${invoice.id}`)
  }

  const handleView = async (invoice) => {
    try {
      const res = await fetch(`${API_URL}/csa/invoices/${invoice.id}`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setViewInvoice(data)
      }
    } catch (err) {
      console.error('Failed to fetch invoice', err)
    }
  }

  const handleDelete = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/csa/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (res.ok) {
        fetchInvoices()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete invoice')
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err)
      alert('Failed to delete invoice')
    }
  }

  const handlePrint = () => {
    window.print()
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Invoices</h1>
          <p className="text-gray-500 mt-1">All invoices created by you</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 md:px-6 py-3 rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/csa/my-billing')}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition flex items-center gap-2"
          >
            + Create New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Grand Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">{invoice.invoiceNo}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {invoice.distributor?.companyName || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.grandTotal)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isEditable(invoice.createdAt) ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Editable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Locked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditable(invoice.createdAt) && (
                          <>
                            <button
                              onClick={() => handleEdit(invoice)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Invoice"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Invoice"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleView(invoice)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                          title="View Invoice"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="print-content bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Invoice Details</h2>
                <p className="text-gray-500 mt-1">Invoice #{viewInvoice.invoiceNo}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewInvoice(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Invoice Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Distributor</h3>
                  <p className="font-medium text-gray-800">{viewInvoice.distributor?.companyName || '-'}</p>
                  {viewInvoice.distributor?.gstIn && <p className="text-sm text-gray-600">GSTIN: {viewInvoice.distributor.gstIn}</p>}
                  {viewInvoice.distributor?.phone && <p className="text-sm text-gray-600">Phone: {viewInvoice.distributor.phone}</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Invoice Info</h3>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span> {new Date(viewInvoice.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Taxable:</span> {formatCurrency(viewInvoice.taxableValue)}
                  </p>
                  {viewInvoice.cgst > 0 && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">CGST:</span> {formatCurrency(viewInvoice.cgst)}
                    </p>
                  )}
                  {viewInvoice.sgst > 0 && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">SGST:</span> {formatCurrency(viewInvoice.sgst)}
                    </p>
                  )}
                  {viewInvoice.igst > 0 && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">IGST:</span> {formatCurrency(viewInvoice.igst)}
                    </p>
                  )}
                  <p className="text-sm font-bold text-gray-900 mt-2 border-t border-gray-300 pt-2">
                    Total: {formatCurrency(viewInvoice.grandTotal)}
                  </p>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Tax %</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewInvoice.invoiceItems?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">{item.product?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.product?.sku || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{item.qty}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(item.rate)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{item.gstPercentage}%</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAMyInvoices