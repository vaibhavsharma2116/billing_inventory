import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Parties from './components/Parties'
import Products from './components/Products'
import Purchase from './components/Purchase'
import Billing from './components/Billing'
import Reports from './components/Reports'
import Claims from './components/Claims'
import Dashboard from './components/Dashboard'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import DistributorDetails from './components/DistributorDetails'
import FinanceLedger from './components/FinanceLedger'
import Login from './components/Login'
import SalesReturns from './components/SalesReturns'
import PaymentsIn from './components/PaymentsIn'
import PurchaseReturns from './components/PurchaseReturns'
import PaymentsOut from './components/PaymentsOut'
import InvoicesList from './components/InvoicesList'
import AdminDashboard from './components/AdminDashboard'
import AdminDistributorDetails from './components/AdminDistributorDetails'
import CSADashboard from './components/CSADashboard'
import CSADistributorDetails from './components/CSADistributorDetails'
import SuperAdminProducts from './components/SuperAdminProducts'
import { useEffect } from 'react'

const isAuthenticated = () => {
  try {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    console.log('isAuthenticated check - token:', !!token, 'user:', user)
    return !!token
  } catch (e) {
    console.error('localStorage access denied:', e)
    return false
  }
}

function App() {
  const location = useLocation()
  
  useEffect(() => {
    console.log('Current location:', location.pathname)
    try {
      if (isAuthenticated()) {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          if (location.pathname === '/login') {
            console.log('Already authenticated, redirecting from login page')
            if (user?.role === 'SUPER_ADMIN') {
              window.location.href = '/superadmin/dashboard'
            } else if (user?.role === 'ADMIN') {
              window.location.href = '/admin/dashboard'
            } else if (user?.role === 'CSA') {
              window.location.href = '/csa/dashboard'
            } else {
              window.location.href = '/'
            }
          } else if (location.pathname === '/' && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'CSA')) {
            console.log('Admin/superadmin/CSA trying to access distributor dashboard, redirecting')
            if (user?.role === 'SUPER_ADMIN') {
              window.location.href = '/superadmin/dashboard'
            } else if (user?.role === 'ADMIN') {
              window.location.href = '/admin/dashboard'
            } else {
              window.location.href = '/csa/dashboard'
            }
          } else if (location.pathname.startsWith('/superadmin') && user?.role !== 'SUPER_ADMIN') {
            console.log('Non-superadmin trying to access superadmin routes, redirecting')
            if (user?.role === 'ADMIN') {
              window.location.href = '/admin/dashboard'
            } else if (user?.role === 'CSA') {
              window.location.href = '/csa/dashboard'
            } else {
              window.location.href = '/'
            }
          } else if (location.pathname.startsWith('/admin') && (user?.role === 'DISTRIBUTOR' || user?.role === 'CSA')) {
            console.log('Distributor/CSA trying to access admin routes, redirecting')
            if (user?.role === 'CSA') {
              window.location.href = '/csa/dashboard'
            } else {
              window.location.href = '/'
            }
          } else if (location.pathname.startsWith('/csa') && user?.role !== 'CSA') {
            console.log('Non-CSA trying to access CSA routes, redirecting')
            if (user?.role === 'SUPER_ADMIN') {
              window.location.href = '/superadmin/dashboard'
            } else if (user?.role === 'ADMIN') {
              window.location.href = '/admin/dashboard'
            } else {
              window.location.href = '/'
            }
          }
        }
      }
    } catch (e) {
      console.error('Error in redirect:', e)
    }
  }, [location.pathname])

  console.log('App rendering')
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          isAuthenticated() ? (
            <div className="min-h-screen bg-gray-50">
              <Sidebar />
              <main className="md:ml-64 pt-24 md:pt-0">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/invoices" element={<InvoicesList />} />
                  <Route path="/sales-returns" element={<SalesReturns />} />
                  <Route path="/payments-in" element={<PaymentsIn />} />
                  <Route path="/purchase" element={<Purchase />} />
                  <Route path="/purchase-returns" element={<PurchaseReturns />} />
                  <Route path="/payments-out" element={<PaymentsOut />} />
                  <Route path="/inventory" element={<Products />} />
                  <Route path="/parties" element={<Parties />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/claims" element={<Claims />} />
                  <Route path="/superadmin/dashboard" element={<SuperAdminDashboard view="dashboard" />} />
                  <Route path="/superadmin/directory" element={<SuperAdminDashboard view="directory" />} />
                  <Route path="/superadmin/create" element={<SuperAdminDashboard view="create" />} />
                  <Route path="/superadmin/finance-ledger" element={<FinanceLedger />} />
                  <Route path="/superadmin/inventory" element={<SuperAdminProducts />} />
                  <Route path="/superadmin/distributor/:distributorId" element={<DistributorDetails />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard view="dashboard" />} />
                  <Route path="/admin/distributors" element={<AdminDashboard view="directory" />} />
                  <Route path="/admin/distributor/:distributorId" element={<AdminDistributorDetails />} />
                  <Route path="/csa/dashboard" element={<CSADashboard view="dashboard" />} />
                  <Route path="/csa/distributors" element={<CSADashboard view="directory" />} />
                  <Route path="/csa/distributor/:distributorId" element={<CSADistributorDetails />} />
                </Routes>
              </main>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </div>
  )
}

export default App
