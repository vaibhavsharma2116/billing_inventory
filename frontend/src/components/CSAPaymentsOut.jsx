import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

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

function CSAPaymentsOut() {
  const navigate = useNavigate()
  const [distributors, setDistributors] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [paymentsOut, setPaymentsOut] = useState([])
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedPayment, setSavedPayment] = useState(null)
  const [showList, setShowList] = useState(false)
  const distributorDropdownRef = useRef(null)

  useEffect(() => {
    fetchDistributors()
  }, [])

  const fetchDistributors = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/distributors`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setDistributors(data || [])
        const savedId = localStorage.getItem('csaDistributorId')
        if (savedId) {
          const found = data.find(d => d.distributorId === savedId || d.id === savedId)
          if (found) {
            selectDistributor(found)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch distributors')
    }
  }

  const selectDistributor = async (dist) => {
    const distId = dist.distributorId || dist.id
    setSelectedDistributor(dist)
    localStorage.setItem('csaDistributorId', distId)
    setShowDistributorDropdown(false)
  }

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

  const fetchPaymentsOut = async () => {
    if (!selectedDistributor) return
    try {
      const distId = selectedDistributor.distributorId || selectedDistributor.id
      const res = await fetch(`${API_URL}/csa/distributors/${distId}/payments-out`, { headers: getAuthHeaders() })
      if (res.ok) {
        setPaymentsOut(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch payments out')
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
      const distId = selectedDistributor.distributorId || selectedDistributor.id
      const res = await fetch(`${API_URL}/csa/distributors/${distId}/payments-out/create`, {
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
      await fetchPaymentsOut()
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
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Payment Out</h1>
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
          {selectedDistributor && (
            <button
              onClick={() => {
                setShowList(!showList)
                if (!showList) fetchPaymentsOut()
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
            >
              {showList ? 'New Payment' : 'View All Payments'}
            </button>
          )}
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
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Payments Sent</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentsOut.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No payments sent yet
                    </td>
                  </tr>
                ) : (
                  paymentsOut.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{payment.paymentNo}</td>
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
                      <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(payment.amount)}</td>
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
            {/* Distributor Dropdown */}
            <div className="relative" ref={distributorDropdownRef}>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Select Distributor</label>
              <div
                onClick={() => setShowDistributorDropdown(!showDistributorDropdown)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer flex items-center justify-between"
              >
                <span className={selectedDistributor ? "text-gray-900 font-medium" : "text-gray-500"}>
                  {selectedDistributor ? selectedDistributor.companyName : "Select a distributor"}
                </span>
                <span className="text-gray-500">▼</span>
              </div>
              {showDistributorDropdown && distributors.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {distributors.map(d => (
                    <div
                      key={d.distributorId || d.id}
                      onClick={() => selectDistributor(d)}
                      className={`px-4 py-3 cursor-pointer transition hover:bg-gray-50 ${
                        selectedDistributor?.id === d.id || selectedDistributor?.distributorId === d.distributorId
                          ? "bg-pink-50"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-gray-800">{d.companyName}</div>
                      <div className="text-sm text-gray-500">{d.ownerName} • {d.city}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDistributor && (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAPaymentsOut