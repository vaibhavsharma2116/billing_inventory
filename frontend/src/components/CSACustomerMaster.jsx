import storage from '../utils/storage'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Edit2, X, Download, Plus, Search, Building2, Eye } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0)
}

function CSACustomerMaster() {
  const navigate = useNavigate()
  const [distributors, setDistributors] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const [editingDistributor, setEditingDistributor] = useState(null)
  const [editDistributorLoading, setEditDistributorLoading] = useState(false)
  const [editDistributorForm, setEditDistributorForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    gstIn: '',
    password: ''
  })

  useEffect(() => {
    fetchDistributors()
  }, [])

  const fetchDistributors = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/csa/distributors?excludeCSAs=true`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setDistributors(data)
      }
    } catch (error) {
      console.error('Failed to fetch distributors:', error)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (dist) => {
    setEditDistributorForm({
      companyName: dist.companyName || '',
      ownerName: dist.ownerName || '',
      email: dist.email || '',
      phone: dist.phone || '',
      city: dist.city || '',
      gstIn: dist.gstIn || '',
      password: ''
    })
    setEditingDistributor(dist)
  }

  const handleEditDistributor = async (e) => {
    e.preventDefault()
    if (!editingDistributor) return
    try {
      setEditDistributorLoading(true)
      const res = await fetch(`${API_URL}/csa/distributors/${editingDistributor.distributorId || editingDistributor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(editDistributorForm)
      })
      if (res.ok) {
        setEditingDistributor(null)
        fetchDistributors()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update Distributor')
      }
    } catch (err) {
      console.error('Failed to update Distributor:', err)
      alert('Failed to update Distributor')
    } finally {
      setEditDistributorLoading(false)
    }
  }

  const filteredDistributors = distributors.filter(d => 
    d.companyName?.toLowerCase().includes(search.toLowerCase()) || 
    d.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={28} className="text-cyan-600" />
            Customer Master
          </h1>
          <p className="text-gray-500 mt-1">Manage your distributors' profiles</p>
        </div>
      </div>

      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by company, owner or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GSTIN</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDistributors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No distributors found</p>
                    </td>
                  </tr>
                ) : (
                  filteredDistributors.map((dist) => (
                    <tr key={dist.distributorId || dist.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{dist.companyName}</div>
                        <div className="text-sm text-gray-500">{dist.ownerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{dist.email}</div>
                        <div className="text-sm text-gray-500">{dist.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {dist.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {dist.gstIn || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          dist.isActive !== false 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {dist.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => navigate(`/csa/customer-master/${dist.distributorId || dist.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-50 text-cyan-600 hover:bg-cyan-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Eye size={16} /> View
                        </button>
                        <button
                          onClick={() => openEditModal(dist)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Edit2 size={16} /> Edit
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

      {/* Edit Distributor Modal */}
      {editingDistributor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Edit Distributor Profile</h2>
              <button onClick={() => setEditingDistributor(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditDistributor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={editDistributorForm.companyName}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, companyName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={editDistributorForm.ownerName}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, ownerName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editDistributorForm.email}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editDistributorForm.phone}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={editDistributorForm.city}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={editDistributorForm.gstIn}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, gstIn: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reset Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={editDistributorForm.password}
                  onChange={(e) => setEditDistributorForm({ ...editDistributorForm, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDistributor(null)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editDistributorLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl font-medium transition disabled:opacity-50"
                >
                  {editDistributorLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSACustomerMaster
