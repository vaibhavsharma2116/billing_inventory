import storage from '../utils/storage'
import { useState, useEffect, useRef } from 'react'
import { X, Eye } from 'lucide-react'

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

function CSAMyPaymentsIn() {
  const [distributors, setDistributors] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [searchDistributor, setSearchDistributor] = useState('')
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false)
  const [paymentsIn, setPaymentsIn] = useState([])
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedPayment, setSavedPayment] = useState(null)
  const [showList, setShowList] = useState(false)
  const [viewPayment, setViewPayment] = useState(null)
  const distributorDropdownRef = useRef(null)

  useEffect(() => {
    fetchDistributors()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (distributorDropdownRef.current && !distributorDropdownRef.current.contains(event.target)) {
        setShowDistributorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchDistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/distributors`, { headers: getAuthHeaders() })
      if (res.ok) {
        setDistributors(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch distributors:', err)
    }
  }

  const filteredDistributors = distributors.filter(d => 
    (typeof d.companyName === 'string' && d.companyName.toLowerCase().includes(searchDistributor.toLowerCase())) ||
    (d.gstIn && typeof d.gstIn === 'string' && d.gstIn.toLowerCase().includes(searchDistributor.toLowerCase()))
  )

  const selectDistributor = (distributor) => {
    setSelectedDistributor(distributor)
    setSearchDistributor(typeof distributor.companyName === 'string' ? distributor.companyName : '')
    setShowDistributorDropdown(false)
  }

  useEffect(() => {
    if (showList) {
      fetchPaymentsIn()
    }
  }, [showList])

  const fetchPaymentsIn = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-payments-in`, { headers: getAuthHeaders() })
      if (res.ok) {
        setPaymentsIn(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch payments in')
    }
  }

  const handleSave = async () => {
    if (!selectedDistributor) {
      setError('Please select a distributor first')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API_URL}/csa/distributors/${selectedDistributor.distributorId}/payments-in/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          amount: parseFloat(amount), 
          paymentMode, 
          referenceNo: referenceNo || null, 
          notes: notes || null 
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedPayment(data)
      await fetchPaymentsIn()
      setTimeout(() => {
        handleNewPayment()
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewPayment = () => {
    setAmount('')
    setPaymentMode('CASH')
    setReferenceNo('')
    setNotes('')
    setSavedPayment(null)
    setError('')
    setShowList(false)
    setSelectedDistributor(null)
    setSearchDistributor('')
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Payments In</h1>
        </div>
        <div className="flex gap-3">
          {savedPayment && (
            <button
              onClick={handleNewPayment}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              + New Payment
            </button>
          )}
          <button
            onClick={() => {
              setShowList(!showList)
              if (!showList) fetchPaymentsIn()
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
          >
            {showList ? 'New Payment' : 'View All Payments'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {savedPayment && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          Payment {savedPayment.paymentNo} saved successfully!
        </div>
      )}

      {showList ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Payments Received</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Distributor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentsIn.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      No payments received yet
                    </td>
                  </tr>
                ) : (
                  paymentsIn.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{payment.paymentNo}</td>
                      <td className="px-4 py-3 text-gray-600">{payment.distributor?.companyName || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.paymentMode === 'CASH' ? 'bg-green-100 text-green-800' :
                          payment.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-800' :
                          payment.paymentMode === 'BANK_TRANSFER' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{payment.referenceNo || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewPayment(payment)}
                          className="text-gray-500 hover:text-pink-600 transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-6">Record Payment</h2>
          
          <div className="space-y-4">
            <div className="relative" ref={distributorDropdownRef}>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Select Distributor</label>
              <input
                type="text"
                placeholder="Search distributor by company name or GSTIN..."
                value={searchDistributor}
                onChange={(e) => { setSearchDistributor(e.target.value); setShowDistributorDropdown(true); setSelectedDistributor(null) }}
                onFocus={() => setShowDistributorDropdown(true)}
                disabled={savedPayment !== null}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {showDistributorDropdown && !savedPayment && filteredDistributors.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredDistributors.map(d => (
                    <div
                      key={d.distributorId}
                      onClick={() => selectDistributor(d)}
                      className="px-4 py-3 hover:bg-pink-50 cursor-pointer transition"
                    >
                      <div className="font-medium text-gray-800">{typeof d.companyName === 'string' ? d.companyName : 'Unnamed'}</div>
                      <div className="text-sm text-gray-500">{(typeof d.gstIn === 'string' && d.gstIn) ? d.gstIn : 'No GSTIN'}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDistributor && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Company Name</label>
                      <p className="font-medium text-gray-800">{typeof selectedDistributor.companyName === 'string' ? selectedDistributor.companyName : '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">GSTIN</label>
                      <p className="font-medium text-gray-800">{(typeof selectedDistributor.gstIn === 'string' && selectedDistributor.gstIn) ? selectedDistributor.gstIn : '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                      <p className="font-medium text-gray-800">{(typeof selectedDistributor.phone === 'string' && selectedDistributor.phone) ? selectedDistributor.phone : '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Reference Number (Optional)</label>
              <input
                type="text"
                placeholder="Transaction ID, Cheque No, etc."
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Notes (Optional)</label>
              <textarea
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition"
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {viewPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Payment Details: {viewPayment.paymentNo}</h2>
              <button
                onClick={() => setViewPayment(null)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment No</div>
                    <div className="font-medium text-gray-900">{viewPayment.paymentNo}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Date</div>
                    <div className="font-medium text-gray-900">{new Date(viewPayment.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Distributor</div>
                  <div className="font-medium text-gray-900">{viewPayment.distributor?.companyName || '-'}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment Mode</div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      viewPayment.paymentMode === 'CASH' ? 'bg-green-100 text-green-800' :
                      viewPayment.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-800' :
                      viewPayment.paymentMode === 'BANK_TRANSFER' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewPayment.paymentMode}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Reference No</div>
                    <div className="font-medium text-gray-900">{viewPayment.referenceNo || '-'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Amount</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(viewPayment.amount)}</div>
                </div>

                {viewPayment.notes && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                      {viewPayment.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAMyPaymentsIn