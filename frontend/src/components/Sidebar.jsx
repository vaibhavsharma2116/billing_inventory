import storage from '../utils/storage'
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  BarChart3, 
  Users, 
  FileBarChart2, 
  AlertCircle, 
  Menu, 
  X, 
  Edit2, 
  Plus,
  Rocket,
  Shield,
  LogOut,
  Building2,
  Key,
  IndianRupee,
  ChevronDown,
  ArrowRight,
  RefreshCw,
  CreditCard,
  UserPlus
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL
const BASE_URL = API_URL?.replace('/api', '') || 'http://api.popbill.in'

const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isBillingDropdownOpen, setIsBillingDropdownOpen] = useState(false)
  const [isPurchaseDropdownOpen, setIsPurchaseDropdownOpen] = useState(false)
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const fileInputRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = storage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      if (user?.logo) {
        setLogo(`${BASE_URL}${user.logo}`)
      }
    }
  }, [])

  const handleLogout = () => {
    storage.removeItem('token')
    storage.removeItem('user')
    navigate('/login')
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogo(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogo(null)
    setLogoFile(null)
  }

  const handleSave = async () => {
    if (!currentUser) return
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('name', editName.trim() || currentUser.name)
      formData.append('role', editRole.trim() === 'ADMIN' ? 'ADMIN' : 'USER')
      if (logoFile) {
        formData.append('logo', logoFile)
      }
      console.log('Saving user with formData:', { name: editName, role: editRole, hasLogoFile: !!logoFile })
      
      const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${storage.getItem('token')}`
        }
      })
      
      console.log('Response status:', res.status)
      
      if (res.ok) {
        const updatedUser = await res.json()
        console.log('Updated user from server:', updatedUser)
        storage.setItem('user', JSON.stringify(updatedUser))
        setCurrentUser(updatedUser)
        
        if (updatedUser.logo) {
          const logoUrl = `${BASE_URL}${updatedUser.logo}`
          console.log('Setting logo to:', logoUrl)
          setLogo(logoUrl)
        } else {
          setLogo(null)
        }
        
        setLogoFile(null)
      } else {
        const errorData = await res.json()
        console.error('Error from server:', errorData)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setLoading(false)
      setIsModalOpen(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long')
      return
    }
    try {
      setPasswordLoading(true)
      const res = await fetch(`${API_URL}/users/change-password/self`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.getItem('token')}`
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      })
      if (res.ok) {
        alert('Password changed successfully')
        setIsPasswordModalOpen(false)
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      alert('Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const isAdmin = currentUser?.role === 'ADMIN'
  const isCSA = currentUser?.role === 'CSA'

  const superAdminNavItems = [
    { name: 'Command Center', path: '/superadmin/dashboard', icon: Shield },
    { 
      name: 'Users', 
      icon: Users,
      isDropdown: true,
      subItems: [
        { name: 'Admin', path: '/superadmin/admins', icon: Shield },
        { name: 'CSA', path: '/superadmin/csas', icon: Building2 },
        { name: 'Distributor', path: '/superadmin/distributors', icon: Users }
      ]
    },
    { name: 'Finance Ledger', path: '/superadmin/finance-ledger', icon: IndianRupee },
    { name: 'Inventory & Products', path: '/superadmin/inventory', icon: Package },
    { name: 'Suppliers', path: '/superadmin/suppliers', icon: Users },
    { name: 'Create User', path: '/superadmin/create', icon: UserPlus }
  ]

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: Shield },
    { name: 'Distributors', path: '/admin/distributors', icon: Building2 }
  ]

  const csaNavItems = [
    { name: 'Dashboard', path: '/csa/my-dashboard', icon: Shield },
    { name: 'Distributors', path: '/csa/distributors', icon: Building2 },
    { name: 'My Products', path: '/csa/my-products', icon: Package },
    { 
      name: 'Billing', 
      icon: FileText,
      isDropdown: true,
      subItems: [
        { name: 'Create Invoice', path: '/csa/my-billing', icon: FileText },
        { name: 'Invoices List', path: '/csa/my-invoices', icon: FileBarChart2 },
        { name: 'Sales Return', path: '/csa/my-sales-returns', icon: RefreshCw },
        { name: 'Payment In', path: '/csa/my-payments-in', icon: CreditCard }
      ]
    },
    { 
      name: 'Purchase Intake', 
      icon: Package,
      isDropdown: true,
      subItems: [
        { name: 'Purchase Bill', path: '/csa/my-purchase', icon: FileText },
        { name: 'Purchase Return', path: '/csa/my-purchase-returns', icon: RefreshCw },
        { name: 'Payment Out', path: '/csa/my-payments-out', icon: CreditCard }
      ]
    },
    { name: 'Reports', path: '/csa/reports', icon: FileBarChart2 },
    { name: 'Claims', path: '/csa/claims', icon: AlertCircle }
  ]

  const distributorNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { 
      name: 'Billing', 
      icon: FileText,
      isDropdown: true,
      subItems: [
        { name: 'Create Invoice', path: '/billing', icon: FileText },
        { name: 'Invoices List', path: '/invoices', icon: FileBarChart2 },
        { name: 'Sales Return', path: '/sales-returns', icon: RefreshCw },
        { name: 'Payment In', path: '/payments-in', icon: CreditCard }
      ]
    },
    { 
      name: 'Purchase Intake', 
      icon: Package,
      isDropdown: true,
      subItems: [
        { name: 'Purchase Bill', path: '/purchase', icon: FileText },
        { name: 'Purchase Return', path: '/purchase-returns', icon: RefreshCw },
        { name: 'Payment Out', path: '/payments-out', icon: CreditCard }
      ]
    },
    { name: 'Inventory', path: '/inventory', icon: BarChart3 },
    { name: 'Parties', path: '/parties', icon: Users },
    { name: 'Reports', path: '/reports', icon: FileBarChart2 },
    { name: 'Claims', path: '/claims', icon: AlertCircle }
  ]

  const navItems = isSuperAdmin ? superAdminNavItems : isAdmin ? adminNavItems : isCSA ? csaNavItems : distributorNavItems

  const userName = currentUser?.name || 'Admin User'
  const userRole = currentUser?.role || 'User'
  const userInitial = (userName || 'U').charAt(0).toUpperCase()

  const isAnyBillingSubPathActive = ['/billing', '/sales-returns', '/payments-in', '/csa/my-billing', '/csa/my-invoices', '/csa/my-sales-returns', '/csa/my-payments-in'].some(path => location.pathname === path)
  const isAnyPurchaseSubPathActive = ['/purchase', '/purchase-returns', '/payments-out', '/csa/my-purchase', '/csa/my-purchase-returns', '/csa/my-payments-out'].some(path => location.pathname === path)
  const isAnyUsersSubPathActive = ['/superadmin/admins', '/superadmin/csas', '/superadmin/distributors'].some(path => location.pathname === path)

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gradient-to-r from-pink-500 to-purple-600 p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <Rocket size={24} className="text-white" />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">DBIM</h1>
            <p className="text-pink-100 text-xs">
              {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : isCSA ? 'CSA' : 'Distributor Billing & Inventory'}
            </p>
          </div>
        </div>
        <button
          className="bg-white/20 text-white p-2 rounded-lg backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-xl transition-all duration-300 z-40 md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo/Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-pink-500 to-purple-600">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            {logo ? (
              <img src={logo} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            ) : (
              <Rocket size={24} className="md:w-8 md:h-8" />
            )}
            DBIM
          </h1>
          <p className="text-pink-100 text-xs md:text-sm mt-1">
            {isSuperAdmin ? 'Super Admin Console' : isAdmin ? 'Admin Console' : isCSA ? 'CSA Console' : 'Distributor Billing & Inventory'}
          </p>
        </div>

        {/* Navigation */}
        <nav className="p-3 md:p-4 overflow-y-auto" style={{ height: 'calc(100% - 160px)' }}>
          <ul className="space-y-2">
            {navItems.map((item) => {
              if (item.isDropdown) {
                const Icon = item.icon
                let isDropdownOpen 
                let toggleDropdown
                let isActive
                if (item.name === 'Billing') {
                  isDropdownOpen = isBillingDropdownOpen
                  toggleDropdown = () => setIsBillingDropdownOpen(!isBillingDropdownOpen)
                  isActive = isAnyBillingSubPathActive
                } else if (item.name === 'Purchase Intake') {
                  isDropdownOpen = isPurchaseDropdownOpen
                  toggleDropdown = () => setIsPurchaseDropdownOpen(!isPurchaseDropdownOpen)
                  isActive = isAnyPurchaseSubPathActive
                } else if (item.name === 'Users') {
                  isDropdownOpen = isUsersDropdownOpen
                  toggleDropdown = () => setIsUsersDropdownOpen(!isUsersDropdownOpen)
                  isActive = isAnyUsersSubPathActive
                }

                return (
                  <li key={item.name} className="space-y-1">
                    <button
                      onClick={toggleDropdown}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isDropdownOpen && (
                      <ul className="ml-4 space-y-1 border-l-2 border-gray-200 pl-3">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon
                          return (
                            <li key={subItem.name}>
                              <Link
                                to={subItem.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                                  location.pathname === subItem.path
                                    ? 'bg-pink-100 text-pink-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <SubIcon size={16} />
                                <span>{subItem.name}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              }
              const Icon = item.icon
              const isActive = isCSA && item.path === '/csa/billing' && location.pathname === '/csa/billing' 
                              || location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Admin User Section */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white">
                  {userInitial}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{userName}</p>
                  <p className="text-gray-500 text-xs">{userRole}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditName(userName)
                  setEditRole(userRole)
                  setIsModalOpen(true)
                }}
                className="text-gray-400 hover:text-pink-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
              >
                <Edit2 size={20} />
              </button>
            </div>
            {!isSuperAdmin && (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl font-medium transition mb-2"
              >
                <Key size={20} />
                Change Password
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Edit User Modal */}
      {isModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  {logo ? (
                    <div className="flex items-center gap-3">
                      <img src={logo} alt="Logo Preview" className="w-16 h-16 object-contain border-2 border-gray-200 rounded-xl" />
                      <button
                        onClick={removeLogo}
                        className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400">No logo uploaded</div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Upload Logo
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter your role"
                  disabled
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 rounded-xl font-medium transition"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleChangePassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Enter your old password"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 rounded-xl font-medium transition"
                  >
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
