import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

const extractPan = (gstin) => {
  if (gstin && gstin.length === 15) {
    return gstin.substring(2, 12);
  }
  return '-';
}

function CSAMyInvoices() {
  const [invoices, setInvoices] = useState([])
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [distributors, setDistributors] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    distributorId: ''
  })
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetchInvoices()
    fetchDistributors()
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (location.state?.printInvoiceId && invoices.length > 0) {
      const targetInvoice = invoices.find(inv => inv.id === location.state.printInvoiceId)
      if (targetInvoice) {
        setViewInvoice(targetInvoice)
        setTimeout(() => window.print(), 500)
        // Clear state to prevent looping on reload
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, invoices])

  useEffect(() => {
    applyFilters()
  }, [invoices, filters])

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/invoices/my`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setInvoices(data)
        setFilteredInvoices(data)
      }
    } catch (err) {
      console.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/distributors`, { headers: getAuthHeaders() })
      if (res.ok) {
        setDistributors(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch distributors')
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, { headers: getAuthHeaders() })
      if (res.ok) {
        setCurrentUser(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch current user')
    }
  }

  const applyFilters = () => {
    let filtered = [...invoices]

    // Filter by distributor
    if (filters.distributorId) {
      filtered = filtered.filter(invoice => invoice.distributorId === filters.distributorId)
    }

    // Filter by from date
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(invoice => new Date(invoice.createdAt) >= fromDate)
    }

    // Filter by to date
    if (filters.toDate) {
      const toDate = new Date(filters.toDate)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(invoice => new Date(invoice.createdAt) <= toDate)
    }

    setFilteredInvoices(filtered)
  }

  const resetFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      distributorId: ''
    })
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
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to view invoice')
      }
    } catch (err) {
      console.error('Failed to fetch invoice', err)
      alert('Failed to view invoice')
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

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Distributor</label>
            <select
              value={filters.distributorId}
              onChange={(e) => setFilters({ ...filters, distributorId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Distributors</option>
              {distributors.map((dist) => (
                <option key={dist.id} value={dist.id}>{dist.companyName}</option>
              ))}
            </select>
          </div>
          <button
            onClick={resetFilters}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SR. NO</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Grand Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No invoices found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">{index + 1}</span>
                    </td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-modal-parent">
          <div className="print-content bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 no-print">
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
              {/* SCREEN ONLY VIEW */}
              <div className="no-print">
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
                    {(parseFloat(viewInvoice.cgst) > 0 || (parseFloat(viewInvoice.igst) === 0 && parseFloat(viewInvoice.cgst) === 0)) && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">CGST:</span> {formatCurrency(viewInvoice.cgst)}
                      </p>
                    )}
                    {(parseFloat(viewInvoice.sgst) > 0 || (parseFloat(viewInvoice.igst) === 0 && parseFloat(viewInvoice.sgst) === 0)) && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">SGST:</span> {formatCurrency(viewInvoice.sgst)}
                      </p>
                    )}
                    {parseFloat(viewInvoice.igst) > 0 && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">IGST:</span> {formatCurrency(viewInvoice.igst)}
                      </p>
                    )}
                    <p className="text-sm font-bold text-gray-900 mt-2 border-t border-gray-300 pt-2">
                      Total: {formatCurrency(viewInvoice.grandTotal)}
                    </p>
                  </div>
                </div>

                {/* Items */}
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
                          const mrp = parseFloat(item.product?.baseSellingPrice) || 0
                          const rate = parseFloat(item.rate) || 0
                          const qty = parseInt(item.qty) || 0
                          const extraMarginPercentage = parseFloat(item.extraMarginPercentage) || 0
                          const gstPercent = parseFloat(item.gstPercentage) || 18

                          const rateWithMargin = rate * (1 - (extraMarginPercentage / 100))
                          const total = qty * rateWithMargin
                          const taxable = total / (1 + (gstPercent / 100))

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-3 text-sm text-gray-800">{item.product?.name || '-'}</td>
                              <td className="px-3 py-3 text-sm text-gray-600">{item.product?.hsn || '-'}</td>
                              <td className="px-3 py-3 text-sm text-gray-600">{formatCurrency(mrp)}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700">{qty}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700">{formatCurrency(rate)}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700">{extraMarginPercentage}%</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700">{formatCurrency(taxable)}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700">{gstPercent}%</td>
                              <td className="px-3 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(total)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* PRINT ONLY VIEW */}
              <div className="hidden print:block p-6 border-[8px] border-[#cda84f] text-gray-800 font-sans bg-white">
                {/* Gold header band */}
                <div className="flex justify-between items-start border-b-2 border-[#cda84f] pb-4 mb-4">
                  <div>
                    <h1 className="text-3xl font-serif font-extrabold text-[#1a2e40] tracking-wide">POPPIK LIFESTYLE PVT LTD</h1>
                    <div className="text-[11px] font-semibold text-gray-700 mt-1">
                      <span>PAN No: <strong className="text-gray-900">AAQCP0247B</strong></span>
                      <span className="mx-3">|</span>
                      <span>GSTIN: <strong className="text-gray-900">27AAQCP0247B1ZK</strong></span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1 flex gap-4">
                      <span>📞 8655324379</span>
                      <span>✉ account@poppik.in</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-lg">
                      213 Sky Lark sector 11 belapur Thane , Thane, Maharashtra, 400614
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5 font-medium">web: www.poppiklifestyle.com</p>
                  </div>
                  <div className="text-right">
                    <div className="border-2 border-gray-400 p-2 inline-block">
                      <h2 className="text-xl font-bold text-[#1a2e40] tracking-wider uppercase">Tax Invoice</h2>
                    </div>
                    <span className="border border-gray-300 text-[9px] text-gray-500 font-bold uppercase px-2 py-0.5 mt-1.5 block tracking-wide text-center">
                      Original For Recipient
                    </span>
                  </div>
                </div>

                {/* Invoice Meta Banner */}
                <div className="grid grid-cols-3 border-b-2 border-[#cda84f] pb-3 mb-4 text-xs font-semibold">
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-mono tracking-wider">Invoice No.</span>
                    <span className="text-sm font-extrabold text-gray-900">{viewInvoice.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-mono tracking-wider">Invoice Date</span>
                    <span className="text-sm font-extrabold text-gray-900">{new Date(viewInvoice.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase block text-[9px] font-mono tracking-wider">Due Date</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {new Date(new Date(viewInvoice.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Bill To & Ship To Box */}
                <div className="grid grid-cols-2 gap-6 border-b-2 border-[#cda84f] pb-4 mb-4 text-xs">
                  <div className="pr-4 border-r border-[#cda84f]">
                    <h3 className="font-bold text-[#cda84f] uppercase tracking-wider mb-2 text-[10px]">Bill To</h3>
                    <p className="font-extrabold text-sm text-[#1a2e40] mb-1">{viewInvoice.distributor?.companyName || '-'}</p>
                    <p className="text-gray-600 font-semibold mb-1">
                      {viewInvoice.distributor?.city ? `${viewInvoice.distributor.city}, Maharashtra, 411041` : 'Pune, Maharashtra, 411041'}
                    </p>
                    <div className="space-y-0.5 text-gray-700">
                      <p><span className="font-bold text-gray-500">Mobile:</span> {viewInvoice.distributor?.phone || '-'}</p>
                      <p className="font-bold"><span className="font-bold text-gray-500">GSTIN:</span> {viewInvoice.distributor?.gstIn || '-'}</p>
                      <p><span className="font-bold text-gray-500">PAN Number:</span> {extractPan(viewInvoice.distributor?.gstIn)}</p>
                      <p><span className="font-bold text-gray-500">Place of Supply:</span> Maharashtra</p>
                    </div>
                  </div>
                  <div className="pl-4">
                    <h3 className="font-bold text-[#cda84f] uppercase tracking-wider mb-2 text-[10px]">Ship To</h3>
                    <p className="font-extrabold text-sm text-[#1a2e40] mb-1">{viewInvoice.distributor?.companyName || '-'}</p>
                    <p className="text-gray-600 font-semibold mb-1">
                      {viewInvoice.distributor?.city ? `${viewInvoice.distributor.city}, Maharashtra, 411041` : 'Pune, Maharashtra, 411041'}
                    </p>
                    <div className="space-y-0.5 text-gray-700">
                      <p><span className="font-bold text-gray-500">Mobile:</span> {viewInvoice.distributor?.phone || '-'}</p>
                      <p className="font-bold"><span className="font-bold text-gray-500">GSTIN:</span> {viewInvoice.distributor?.gstIn || '-'}</p>
                      <p><span className="font-bold text-gray-500">PAN Number:</span> {extractPan(viewInvoice.distributor?.gstIn)}</p>
                      <p><span className="font-bold text-gray-500">Place of Supply:</span> Maharashtra</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-gray-200 mb-6">
                  <thead>
                    <tr className="bg-[#fcf8e3]">
                      <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-bold text-gray-700 w-8">No</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-[10px] font-bold text-gray-700">Items</th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-bold text-gray-700 w-20">HSN No.</th>
                      <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-16">Qty.</th>
                      <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-24">MRP</th>
                      <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-20">Rate</th>
                      <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-20">Disc.</th>
                      <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-20">Tax</th>
                      <th className="border border-gray-300 px-2 py-2 text-right text-[10px] font-bold text-gray-700 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.invoiceItems?.map((item, idx) => {
                      const mrp = parseFloat(item.product?.baseSellingPrice) || 0
                      const rateWithGst = parseFloat(item.rate) || 0
                      const gstPercentage = parseFloat(item.gstPercentage) || 18
                      const qty = parseInt(item.qty) || 0
                      const extraMarginPercentage = parseFloat(item.extraMarginPercentage) || 0

                      const rateExcludingGst = rateWithGst / (1 + (gstPercentage / 100))
                      const discountPercentageFromMrp = mrp > 0 ? ((mrp - rateExcludingGst) / mrp) * 100 : 0
                      const itemDiscount = rateExcludingGst * (extraMarginPercentage / 100) * qty
                      const taxableAfterMargin = (rateExcludingGst * qty) - itemDiscount
                      const taxAmt = taxableAfterMargin * (gstPercentage / 100)
                      const itemTotal = taxableAfterMargin + taxAmt

                      return (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="px-2 py-2 text-xs text-gray-500 text-center">{idx + 1}</td>
                          <td className="px-2 py-2 text-xs font-semibold text-gray-900">{item.product?.name || '-'}</td>
                          <td className="px-2 py-2 text-xs text-gray-600 text-center">{item.product?.hsn || '-'}</td>
                          <td className="px-2 py-2 text-xs text-right text-gray-700 whitespace-nowrap">{qty} PCS</td>
                          <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
                            <div className="text-gray-800 font-semibold">{formatCurrency(mrp)}</div>
                            {discountPercentageFromMrp > 0 && (
                              <div className="text-[9px] text-green-600 font-bold">({discountPercentageFromMrp.toFixed(2)}% OFF)</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-gray-700">{formatCurrency(rateExcludingGst)}</td>
                          <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
                            {itemDiscount > 0 ? (
                              <>
                                <div className="text-red-600 font-semibold">{formatCurrency(itemDiscount)}</div>
                                <div className="text-[9px] text-gray-500">({extraMarginPercentage}%)</div>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
                            {taxAmt > 0 ? (
                              <>
                                <div className="text-gray-700 font-semibold">{formatCurrency(taxAmt)}</div>
                                <div className="text-[9px] text-gray-500">({gstPercentage}%)</div>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-right font-bold text-gray-900">{formatCurrency(itemTotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Summary Totals block */}
                <div className="flex flex-col items-end gap-1.5 border-t-2 border-[#cda84f] pt-4 mt-4">
                  <div className="flex justify-between w-64 text-xs">
                    <span className="text-gray-600 font-semibold">Taxable Value:</span>
                    <span className="font-bold text-gray-850">{formatCurrency(viewInvoice.taxableValue)}</span>
                  </div>
                  {(parseFloat(viewInvoice.cgst) > 0 || (parseFloat(viewInvoice.igst) === 0 && parseFloat(viewInvoice.cgst) === 0)) && (
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-gray-600 font-semibold">CGST:</span>
                      <span className="font-bold text-gray-850">{formatCurrency(viewInvoice.cgst)}</span>
                    </div>
                  )}
                  {(parseFloat(viewInvoice.sgst) > 0 || (parseFloat(viewInvoice.igst) === 0 && parseFloat(viewInvoice.sgst) === 0)) && (
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-gray-600 font-semibold">SGST:</span>
                      <span className="font-bold text-gray-850">{formatCurrency(viewInvoice.sgst)}</span>
                    </div>
                  )}
                  {parseFloat(viewInvoice.igst) > 0 && (
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-gray-600 font-semibold">IGST:</span>
                      <span className="font-bold text-gray-850">{formatCurrency(viewInvoice.igst)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-1.5 flex justify-between w-64 text-sm font-extrabold text-gray-950 mt-1">
                    <span className="text-[#1a2e40]">Grand Total:</span>
                    <span className="text-green-600 text-base">{formatCurrency(viewInvoice.grandTotal)}</span>
                  </div>
                </div>

                {/* Fine print footer */}
                <div className="text-center text-[10px] text-gray-400 border-t border-gray-200 pt-3 mt-8">
                  This is a computer-generated tax invoice and does not require signature.
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