import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, Eye, X, RefreshCw, Printer, Download, Search } from 'lucide-react'
import { downloadInvoicePDF } from '../utils/invoicePdfGenerator'

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

const extractPan = (gstin) => {
  if (gstin && gstin.length === 15) {
    return gstin.substring(2, 12);
  }
  return '-';
}

function InvoicesList() {
  const [invoices, setInvoices] = useState([])
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [parties, setParties] = useState([])
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  })
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    partyId: ''
  })
  
  const [viewInvoice, setViewInvoice] = useState(null)
  const printRef = useRef()

  async function fetchInvoices() {
    try {
      const res = await fetch(`${API_URL}/invoices`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        // Sort ascending by createdAt (latest last)
        const sortedData = data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        setInvoices(sortedData)
        setFilteredInvoices(sortedData)
      }
    } catch (err) {
      console.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  async function fetchParties() {
    try {
      const res = await fetch(`${API_URL}/parties`, { headers: getAuthHeaders() })
      if (res.ok) {
        setParties(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch parties')
    }
  }

  function applyFilters() {
    let filtered = [...invoices]

    if (filters.partyId) {
      filtered = filtered.filter(invoice => invoice.partyId === filters.partyId)
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(invoice => new Date(invoice.createdAt) >= fromDate)
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(invoice => new Date(invoice.createdAt) <= toDate)
    }

    setFilteredInvoices(filtered)
  }

  function resetFilters() {
    setFilters({
      fromDate: '',
      toDate: '',
      partyId: ''
    })
  }

  useEffect(() => {
    fetchInvoices()
    fetchParties()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [invoices, filters])

  const handleEdit = (invoice) => {
    navigate(`/billing?edit=${invoice.id}`)
  }

  const handleView = async (invoice) => {
    try {
      const res = await fetch(`${API_URL}/invoices/${invoice.id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        setViewInvoice(await res.json())
      } else {
        alert('Failed to view invoice')
      }
    } catch (err) {
      console.error('Failed to view invoice', err)
    }
  }

  const downloadPDF = () => {
    if (!viewInvoice) return;
    downloadInvoicePDF(viewInvoice, user, false);
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Invoices</h1>
          <p className="text-gray-500 mt-1">Manage and view all invoices</p>
        </div>
        <button
          onClick={() => navigate('/billing')}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition flex items-center gap-2"
        >
          + Create New Invoice
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Party</label>
            <select
              value={filters.partyId}
              onChange={(e) => setFilters({ ...filters, partyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Parties</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center gap-2 w-full justify-center"
            >
              <RefreshCw size={18} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Grand Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No invoices match your filters
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">{invoice.invoiceNo}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {invoice.party?.name || '-'}
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
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Invoice"
                          >
                            <Edit2 size={18} />
                          </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Invoice {viewInvoice.invoiceNo}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadPDF}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewInvoice(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Distributor</h3>
                  <p className="font-medium text-gray-800">{viewInvoice.distributor?.companyName || user?.companyName || user?.name || '-'}</p>
                  {(viewInvoice.distributor?.gstIn || user?.gstIn) && <p className="text-sm text-gray-600">GSTIN: {viewInvoice.distributor?.gstIn || user?.gstIn}</p>}
                  {(viewInvoice.distributor?.phone || user?.phone) && <p className="text-sm text-gray-600">Phone: {viewInvoice.distributor?.phone || user?.phone}</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Invoice Info</h3>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span> {new Date(viewInvoice.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Taxable:</span> {formatCurrency(viewInvoice.taxableValue)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">CGST:</span> {formatCurrency(parseFloat(viewInvoice.cgst || 0) + parseFloat(viewInvoice.igst || 0) / 2)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">SGST:</span> {formatCurrency(parseFloat(viewInvoice.sgst || 0) + parseFloat(viewInvoice.igst || 0) / 2)}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-2 border-t border-gray-300 pt-2">
                    Total: {formatCurrency(viewInvoice.grandTotal)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">HSN</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">MRP</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Rate</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Margin %</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Taxable</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">GST %</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewInvoice.invoiceItems?.map((item, idx) => {
                        const mrp = parseFloat(item.mrp) || parseFloat(item.product?.baseSellingPrice) || 0
                        const rateWithGst = parseFloat(item.rate) || 0
                        const gstPercentage = parseFloat(item.gstPercentage) || 18
                        const qty = parseInt(item.qty) || 0
                        const extraMarginPercentage = parseFloat(item.extraMarginPercentage) || 0

                        const rateExcludingGst = rateWithGst / (1 + (gstPercentage / 100))
                        const taxableAfterMargin = rateExcludingGst * qty
                        const taxAmt = taxableAfterMargin * (gstPercentage / 100)
                        const itemTotal = taxableAfterMargin + taxAmt

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-sm text-gray-800">{item.productName || item.product?.name || '-'}</td>
                            <td className="px-3 py-3 text-sm text-gray-600">{item.hsn || item.product?.hsn || '-'}</td>
                            <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(mrp)}</td>
                            <td className="px-3 py-3 text-sm text-right text-gray-700">{qty}</td>
                            <td className="px-3 py-3 text-sm text-right text-gray-700">{formatCurrency(rateWithGst)}</td>
                            <td className="px-3 py-3 text-sm text-right text-gray-700">{extraMarginPercentage}%</td>
                            <td className="px-3 py-3 text-sm text-right text-gray-700">{formatCurrency(taxableAfterMargin)}</td>
                            <td className="px-3 py-3 text-sm text-right text-gray-700">{gstPercentage}%</td>
                            <td className="px-3 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(itemTotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-content, .print-content * {
            visibility: visible !important;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default InvoicesList
