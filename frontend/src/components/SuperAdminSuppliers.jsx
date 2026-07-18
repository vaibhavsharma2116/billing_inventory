import storage from '../utils/storage'
import React, { useEffect, useState } from 'react'
import { Plus, X, Edit, Trash2, Search } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = storage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function SuperAdminSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [csas, setCsas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    csaId: '',
    isForAllCSAs: false
  })
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [suppliersRes, csasRes] = await Promise.all([
        fetch(`${API_URL}/suppliers/all`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/csas`, { headers: getAuthHeaders() })
      ])

      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        setSuppliers(data)
      }

      if (csasRes.ok) {
        const data = await csasRes.json()
        setCsas(data)
      }
    } catch (err) {
      console.error('Failed to fetch suppliers data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(search.toLowerCase()) ||
                         (supplier.gstin && supplier.gstin.toLowerCase().includes(search.toLowerCase()))
    return matchesSearch
  })

  const handleCreateSupplier = async (e) => {
    e.preventDefault()
    try {
      setCreateLoading(true)
      const res = await fetch(`${API_URL}/suppliers/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setFormData({
          name: '',
          phone: '',
          email: '',
          gstin: '',
          address: '',
          csaId: '',
          isForAllCSAs: false
        })
        setShowCreateModal(false)
        fetchAllData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create supplier')
      }
    } catch (err) {
      console.error('Failed to create supplier:', err)
      alert('Failed to create supplier')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateSupplier = async (e) => {
    e.preventDefault()
    if (!editingSupplier) return
    try {
      setCreateLoading(true)
      const res = await fetch(`${API_URL}/suppliers/all/${editingSupplier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setEditingSupplier(null)
        setFormData({
          name: '',
          phone: '',
          email: '',
          gstin: '',
          address: '',
          csaId: '',
          isForAllCSAs: false
        })
        fetchAllData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update supplier')
      }
    } catch (err) {
      console.error('Failed to update supplier:', err)
      alert('Failed to update supplier')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return
    try {
      const res = await fetch(`${API_URL}/suppliers/all/${supplierId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (res.ok) {
        fetchAllData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete supplier')
      }
    } catch (err) {
      console.error('Failed to delete supplier:', err)
      alert('Failed to delete supplier')
    }
  }

  const startEditSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      gstin: supplier.gstin || '',
      address: supplier.address || '',
      csaId: supplier.csaId || '',
      isForAllCSAs: supplier.isForAllCSAs || false
    })
    setShowCreateModal(true)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Suppliers Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or GSTIN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No suppliers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GSTIN</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CSA</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">For All CSAs</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.map(supplier => {
                  const csa = csas.find(c => c.id === supplier.csaId)
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900">{supplier.name}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">{supplier.phone || '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">{supplier.email || '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">{supplier.gstin || '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">{csa?.name || '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.isForAllCSAs ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {supplier.isForAllCSAs ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditSupplier(supplier)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(supplier.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingSupplier(null)
                  setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    gstin: '',
                    address: '',
                    csaId: '',
                    isForAllCSAs: false
                  })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSA</label>
                <select
                  value={formData.csaId}
                  onChange={(e) => setFormData({ ...formData, csaId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No CSA</option>
                  {csas.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isForAllCSAs"
                  checked={formData.isForAllCSAs}
                  onChange={(e) => setFormData({ ...formData, isForAllCSAs: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isForAllCSAs" className="text-sm font-medium text-gray-700">
                  Show this supplier to all CSAs
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingSupplier(null)
                    setFormData({
                      name: '',
                      phone: '',
                      email: '',
                      gstin: '',
                      address: '',
                      csaId: ''
                    })
                  }}
                  className="px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  {createLoading ? 'Saving...' : (editingSupplier ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminSuppliers
