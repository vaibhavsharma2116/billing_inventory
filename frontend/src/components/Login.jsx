import storage from '../utils/storage'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      console.log('Login successful:', data)
      try {
        storage.setItem('token', data.token)
        storage.setItem('user', JSON.stringify(data.user))
        console.log('Token stored:', storage.getItem('token'))
        console.log('User stored:', storage.getItem('user'))
      } catch (e) {
        console.error('localStorage error:', e)
        throw new Error('Browser storage access denied. Please enable cookies/storage.')
      }

      if (data.user.role === 'SUPER_ADMIN') {
        console.log('Navigating to superadmin dashboard')
        navigate('/superadmin/dashboard')
      } else if (data.user.role === 'ADMIN') {
        console.log('Navigating to admin dashboard')
        navigate('/admin/dashboard')
      } else if (data.user.role === 'CSA') {
        console.log('Navigating to CSA dashboard')
        navigate('/csa/dashboard')
      } else {
        console.log('Navigating to distributor dashboard')
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket size={32} className="text-white" />
            <h1 className="text-2xl font-bold text-white">DBIM</h1>
          </div>
          <p className="text-pink-100">Distributor Billing & Inventory</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome back</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          

        </div>
      </div>
    </div>
  )
}

export default Login
