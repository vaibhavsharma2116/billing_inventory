import storage from '../utils/storage'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'

const BASE_API_URL = import.meta.env.VITE_API_URL
const API_URL = `${BASE_API_URL}/parties`

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function Parties() {
  const navigate = useNavigate()
  const [parties, setParties] = useState([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParty, setEditingParty] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    creditLimit: '',
    phone: '',
    margin: ''
  })

  useEffect(() => {
    fetchParties()
  }, [search])

  const fetchParties = async () => {
    try {
      setLoading(true)
      const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL
      const res = await fetch(url, { headers: getAuthHeaders() })
      const data = await res.json()
      setParties(data)
    } catch (err) {
      setError('Failed to fetch parties')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingParty(null)
    setFormData({ name: '', gstin: '', address: '', creditLimit: '', phone: '', margin: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (party) => {
    setEditingParty(party)
    setFormData({
      name: typeof party.name === 'string' ? party.name : '',
      gstin: typeof party.gstin === 'string' ? party.gstin : '',
      address: typeof party.address === 'string' ? party.address : '',
      creditLimit: typeof party.creditLimit === 'number' ? party.creditLimit.toString() : '',
      phone: typeof party.phone === 'string' ? party.phone : '',
      margin: typeof party.margin === 'number' ? party.margin.toString() : ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      console.log('Saving party with data:', formData)
      
      const url = editingParty ? `${API_URL}/${editingParty.id}` : API_URL
      const method = editingParty ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save party')
      }
      
      const savedParty = await res.json()
      console.log('Party saved successfully:', savedParty)
      
      setIsModalOpen(false)
      fetchParties()
      alert(editingParty ? 'Party updated successfully!' : 'Party added successfully!')
    } catch (err) {
      console.error('Error saving party:', err)
      setError(err.message || 'Failed to save party')
      alert(err.message || 'Failed to save party')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this party?')) return
    try {
      await fetch(`${API_URL}/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      fetchParties()
    } catch (err) {
      setError('Failed to delete party')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Customer Master</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition"
        >
          + Add New Party
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GSTIN</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Credit Limit</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Margin (%)</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parties.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 md:px-6 py-10 text-center text-gray-500">
                      No parties found
                    </td>
                  </tr>
                ) : (
                  parties.map((party) => (
                    <tr key={party.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm md:text-base">{typeof party.name === 'string' ? party.name : '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600 text-sm md:text-base">{(typeof party.gstin === 'string' && party.gstin) ? party.gstin : '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600 text-sm md:text-base">{(typeof party.phone === 'string' && party.phone) ? party.phone : '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600 text-sm md:text-base">{typeof party.creditLimit === 'number' ? `₹${party.creditLimit}` : '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600 text-sm md:text-base">{typeof party.margin === 'number' ? `${party.margin}%` : '-'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 max-w-xs truncate text-sm md:text-base">{(typeof party.address === 'string' && party.address) ? party.address : '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => navigate(`/parties/${party.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-600 hover:bg-cyan-100 rounded-lg text-sm font-medium transition-colors mr-2"
                        >
                          <Eye size={16} /> View
                        </button>
                        <button
                          onClick={() => openEditModal(party)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(party.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm md:text-base ml-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {editingParty ? 'Edit Party' : 'Add New Party'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margin (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.margin}
                    onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  {editingParty ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Parties
