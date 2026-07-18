import storage from '../utils/storage'
import { useState, useEffect, useRef } from 'react'
import { Eye } from 'lucide-react'

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

function CSAMyPaymentsOut() {
  const [paymentsOut, setPaymentsOut] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [supplierName, setSupplierName] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedPayment, setSavedPayment] = useState(null)
  const [showList, setShowList] = useState(false)
  const [viewPayment, setViewPayment] = useState(null)
  const supplierDropdownRef = useRef(null)

  useEffect(() => {
    if (showList) {
      fetchPaymentsOut()
    }
    fetchSuppliers()
  }, [showList])

  const fetchPaymentsOut = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-payments-out`, { headers: getAuthHeaders() })
      if (res.ok) {
        setPaymentsOut(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch payments out')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-suppliers`, { headers: getAuthHeaders() })
      if (res.ok) {
        setSuppliers(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s?.name?.toLowerCase().includes(supplierName.toLowerCase())
  )

  const selectSupplier = (supplier) => {
    setSupplierName(supplier.name)
    setShowSupplierDropdown(false)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API_URL}/csa/my-payments-out/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          amount: parseFloat(amount), 
          paymentMode, 
          referenceNo: referenceNo || null, 
          notes: notes || null,
          supplierName
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
    setSupplierName('')
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Payments Out</h1>
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
              if (!showList) fetchPaymentsOut()
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
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Payments Sent</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentsOut.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      No payments sent yet
                    </td>
                  </tr>
                ) : (
                  paymentsOut.map((payment, index) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{payment.paymentNo}</td>
                      <td className="px-4 py-3 text-gray-600">{payment.supplierName || '-'}</td>
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
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setViewPayment(payment)} className="text-blue-600 hover:text-blue-800" title="View Payment">
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
            {/* Supplier Name */}
            <div className="relative" ref={supplierDropdownRef}>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Supplier Name</label>
              <input
                type="text"
                placeholder="Enter supplier name"
                value={supplierName}
                onChange={(e) => { setSupplierName(e.target.value); setShowSupplierDropdown(true) }}
                onFocus={() => setShowSupplierDropdown(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuppliers.map((supplier, index) => (
                    <div
                      key={supplier.id || index}
                      onClick={() => selectSupplier(supplier)}
                      className="px-4 py-3 hover:bg-green-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-800">{supplier.name}</div>
                    </div>
                  ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Payment Details - {viewPayment.paymentNo}</h2>
              <button onClick={() => setViewPayment(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Supplier</p>
                  <p className="font-medium text-gray-900 text-lg">{viewPayment.supplierName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                  <p className="font-medium text-gray-900 text-lg">{new Date(viewPayment.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Mode</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    viewPayment.paymentMode === 'CASH' ? 'bg-green-100 text-green-800' :
                    viewPayment.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-800' :
                    viewPayment.paymentMode === 'BANK_TRANSFER' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewPayment.paymentMode}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                  <p className="font-bold text-green-600 text-2xl">{formatCurrency(viewPayment.amount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Reference No.</p>
                  <p className="font-medium text-gray-900">{viewPayment.referenceNo || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                  <p className="font-medium text-gray-900 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[60px]">{viewPayment.notes || '-'}</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setViewPayment(null)}
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAMyPaymentsOut