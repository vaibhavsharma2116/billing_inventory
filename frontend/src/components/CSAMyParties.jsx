import storage from '../utils/storage'
import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function CSAMyParties() {
  const [parties, setParties] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    phone: '',
    creditLimit: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchParties()
  }, [])

  const fetchParties = async () => {
    try {
      const res = await fetch(`${API_URL}/csa/my-parties`, { headers: getAuthHeaders() })
      if (res.ok) {
        setParties(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch parties:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/csa/my-parties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsModalOpen(false)
        setFormData({
          name: '',
          gstin: '',
          address: '',
          phone: '',
          creditLimit: ''
        })
        fetchParties()
      }
    } catch (err) {
      console.error('Failed to add party:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Parties</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 md:px-6 py-2 rounded-xl font-medium transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add Party
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GSTIN</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Credit Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {parties.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    No parties yet
                  </td>
                </tr>
              ) : (
                parties.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600">{p.gstin || '-'}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600">{p.phone || '-'}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-600">{p.address || '-'}</td>
                    <td className="px-4 md:px-6 py-4 font-medium text-gray-800">{p.creditLimit ? `₹${parseFloat(p.creditLimit).toFixed(2)}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add Party</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {loading ? 'Creating...' : 'Create Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSAMyParties