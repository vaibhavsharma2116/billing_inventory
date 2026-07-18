import storage from '../utils/storage'
import { useState, useEffect } from 'react'
import { Eye, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function PaymentsIn() {
  const [parties, setParties] = useState([])
  const [paymentsIn, setPaymentsIn] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [searchParty, setSearchParty] = useState('')
  const [showPartyDropdown, setShowPartyDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedPayment, setSavedPayment] = useState(null)
  const [showList, setShowList] = useState(true)
  const [viewPayment, setViewPayment] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => {
    fetchParties()
    fetchPaymentsIn()
  }, [])

  const fetchParties = async () => {
    try {
      const res = await fetch(`${API_URL}/parties`, { headers: getAuthHeaders() })
      setParties(await res.json())
    } catch (err) {
      console.error('Failed to fetch parties')
    }
  }

  const fetchPaymentsIn = async () => {
    try {
      const res = await fetch(`${API_URL}/payments-in`, { headers: getAuthHeaders() })
      setPaymentsIn(await res.json())
    } catch (err) {
      console.error('Failed to fetch payments in')
    }
  }

  const filteredParties = parties.filter(p => 
    (typeof p.name === 'string' && p.name.toLowerCase().includes(searchParty.toLowerCase())) ||
    (p.gstin && typeof p.gstin === 'string' && p.gstin.toLowerCase().includes(searchParty.toLowerCase()))
  )

  const selectParty = (party) => {
    setSelectedParty(party)
    setSearchParty(typeof party.name === 'string' ? party.name : '')
    setShowPartyDropdown(false)
  }

  const handleSave = async () => {
    if (!selectedParty) {
      setError('Please select a customer first')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API_URL}/payments-in/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          partyId: selectedParty.id, 
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
      // Auto reset form after successful save for quick new entry
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
    setSelectedParty(null)
    setSearchParty('')
    setAmount('')
    setPaymentMode('CASH')
    setReferenceNo('')
    setNotes('')
    setSavedPayment(null)
    setError('')
    setShowList(false)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Payment In</h1>
        <div className="flex gap-3">
          {!showList && (
            <button
              onClick={handleNewPayment}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              + New Payment
            </button>
          )}
          <button
            onClick={() => setShowList(!showList)}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Action</th>
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
                  paymentsIn.map((payment, idx) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{payment.paymentNo}</td>
                      <td className="px-4 py-3 text-gray-700">{payment.party?.name || '-'}</td>
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
                      <td className="px-4 py-3 text-right font-semibold text-green-600">₹{(parseFloat(payment.amount) || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setViewPayment(payment); setShowViewModal(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                          <Eye className="w-5 h-5" />
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
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Customer</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customer by name or GSTIN..."
                  value={searchParty}
                  onChange={(e) => { setSearchParty(e.target.value); setShowPartyDropdown(true); setSelectedParty(null) }}
                  onFocus={() => setShowPartyDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showPartyDropdown && filteredParties.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredParties.map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectParty(p)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                      >
                        <div className="font-medium text-gray-800">{typeof p.name === 'string' ? p.name : 'Unnamed'}</div>
                        <div className="text-sm text-gray-500">{(typeof p.gstin === 'string' && p.gstin) ? p.gstin : 'No GSTIN'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedParty && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                    <p className="font-medium text-gray-800">{typeof selectedParty.name === 'string' ? selectedParty.name : '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">GSTIN</label>
                    <p className="font-medium text-gray-800">{(typeof selectedParty.gstin === 'string' && selectedParty.gstin) ? selectedParty.gstin : '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                    <p className="font-medium text-gray-800">{(typeof selectedParty.phone === 'string' && selectedParty.phone) ? selectedParty.phone : '-'}</p>
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Notes (Optional)</label>
              <textarea
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-lg font-medium transition"
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Payment Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium text-sm">Payment No</span>
                  <span className="font-semibold text-gray-900">{viewPayment.paymentNo}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium text-sm">Customer</span>
                  <span className="font-semibold text-gray-900">{viewPayment.party?.name || '-'}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium text-sm">Date</span>
                  <span className="font-semibold text-gray-900">{new Date(viewPayment.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium text-sm">Amount</span>
                  <span className="font-semibold text-green-600">₹{(parseFloat(viewPayment.amount) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium text-sm">Mode</span>
                  <span className="font-semibold text-gray-900">{viewPayment.paymentMode}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium text-sm">Reference No</span>
                  <span className="font-semibold text-gray-900">{viewPayment.referenceNo || '-'}</span>
                </div>
                {viewPayment.notes && (
                  <div className="pt-2">
                    <span className="text-gray-500 font-medium text-sm block mb-1">Notes</span>
                    <p className="text-gray-800 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{viewPayment.notes}</p>
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

export default PaymentsIn
