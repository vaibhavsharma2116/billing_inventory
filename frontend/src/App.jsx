import storage from './utils/storage'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Parties from './components/Parties'
import PartyProfile from './components/PartyProfile'
import Products from './components/Products'
import Purchase from './components/Purchase'
import Billing from './components/Billing'
import DistributorReports from './components/DistributorReports'
import Reports from './components/Reports'
import Claims from './components/Claims'
import Dashboard from './components/Dashboard'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import SuperAdminAnalytics from './components/SuperAdminAnalytics'
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
import AdminCSADetails from './components/AdminCSADetails'
import SuperAdminCSADetails from './components/SuperAdminCSADetails'
import CSADashboard from './components/CSADashboard'
import CSADistributorDetails from './components/CSADistributorDetails'
import CSAInvoicesList from './components/CSAInvoicesList'
import CSASalesReturns from './components/CSASalesReturns'
import CSAPaymentsIn from './components/CSAPaymentsIn'
import CSAPurchase from './components/CSAPurchase'
import CSAPurchaseReturns from './components/CSAPurchaseReturns'
import CSAPaymentsOut from './components/CSAPaymentsOut'
import CSAMyDashboard from './components/CSAMyDashboard'
import CSAMyPurchase from './components/CSAMyPurchase'
import CSAMyProducts from './components/CSAMyProducts'
import CSAMyParties from './components/CSAMyParties'
import CSACustomerMaster from './components/CSACustomerMaster'
import CSACustomerProfile from './components/CSACustomerProfile'
import CSAPurchaseRequests from './components/CSAPurchaseRequests'
import CSAMySalesReturns from './components/CSAMySalesReturns'
import CSAMyBilling from './components/CSAMyBilling'
import CSAMyInvoices from './components/CSAMyInvoices'
import CSAMyPaymentsIn from './components/CSAMyPaymentsIn'
import CSAMyPurchaseReturns from './components/CSAMyPurchaseReturns'
import CSAMyPaymentsOut from './components/CSAMyPaymentsOut'
import CSAReports from './components/CSAReports'
import CSAAnalytics from './components/CSAAnalytics'
import CSAClaims from './components/CSAClaims'
import SuperAdminProducts from './components/SuperAdminProducts'
import SuperAdminDistributorProducts from './components/SuperAdminDistributorProducts'
import SuperAdminSuppliers from './components/SuperAdminSuppliers'
import SuperAdminPurchaseRequests from './components/SuperAdminPurchaseRequests'
import { useEffect } from 'react'

const isAuthenticated = () => {
  try {
    const token = storage.getItem('token')
    const user = storage.getItem('user')
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
        const userStr = storage.getItem('user')
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
                  <Route path="/parties/:id" element={<PartyProfile />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/analytics" element={<DistributorReports />} />
                  <Route path="/claims" element={<Claims />} />
                  <Route path="/superadmin/dashboard" element={<SuperAdminDashboard view="dashboard" />} />
                  <Route path="/superadmin/analytics" element={<SuperAdminAnalytics />} />
                  <Route path="/superadmin/admins" element={<SuperAdminDashboard view="admins" />} />
                  <Route path="/superadmin/csas" element={<SuperAdminDashboard view="csas" />} />
                  <Route path="/superadmin/distributors" element={<SuperAdminDashboard view="distributors" />} />
                  <Route path="/superadmin/create" element={<SuperAdminDashboard view="create" />} />
                  <Route path="/superadmin/finance-ledger" element={<FinanceLedger />} />
                  <Route path="/superadmin/inventory" element={<SuperAdminProducts />} />
                  <Route path="/superadmin/inventory-distributor" element={<SuperAdminDistributorProducts />} />
                  <Route path="/superadmin/suppliers" element={<SuperAdminSuppliers />} />
                  <Route path="/superadmin/purchase-requests" element={<SuperAdminPurchaseRequests />} />
                  <Route path="/superadmin/distributor/:distributorId" element={<DistributorDetails />} />
                  <Route path="/superadmin/csa/:csaId" element={<SuperAdminCSADetails />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard view="dashboard" />} />
                  <Route path="/admin/distributors" element={<AdminDashboard view="directory" />} />
                  <Route path="/admin/distributor/:distributorId" element={<AdminDistributorDetails />} />
                  <Route path="/admin/csa/:csaId" element={<AdminCSADetails />} />
                  <Route path="/csa/dashboard" element={<CSADashboard view="dashboard" />} />
                  <Route path="/csa/distributors" element={<CSADashboard view="directory" />} />
                  <Route path="/csa/distributor/:distributorId" element={<CSADistributorDetails />} />
                  <Route path="/csa/billing" element={<Billing />} />
                  <Route path="/csa/invoices" element={<CSAInvoicesList />} />
                  <Route path="/csa/sales-returns" element={<CSASalesReturns />} />
                  <Route path="/csa/payments-in" element={<CSAPaymentsIn />} />
                  <Route path="/csa/purchase" element={<CSAPurchase />} />
                  <Route path="/csa/purchase-returns" element={<CSAPurchaseReturns />} />
                  <Route path="/csa/payments-out" element={<CSAPaymentsOut />} />
                  <Route path="/csa/my-dashboard" element={<CSAMyDashboard />} />
                  <Route path="/csa/my-purchase" element={<CSAMyPurchase />} />
                  <Route path="/csa/purchase-requests" element={<CSAPurchaseRequests />} />
                  <Route path="/csa/my-products" element={<CSAMyProducts />} />
                  <Route path="/csa/my-parties" element={<CSAMyParties />} />
                  <Route path="/csa/customer-master" element={<CSACustomerMaster />} />
                  <Route path="/csa/customer-master/:distributorId" element={<CSACustomerProfile />} />
                  <Route path="/csa/my-sales-returns" element={<CSAMySalesReturns />} />
                  <Route path="/csa/my-billing" element={<CSAMyBilling />} />
                  <Route path="/csa/my-invoices" element={<CSAMyInvoices />} />
                  <Route path="/csa/my-payments-in" element={<CSAMyPaymentsIn />} />
                  <Route path="/csa/my-purchase-returns" element={<CSAMyPurchaseReturns />} />
                  <Route path="/csa/my-payments-out" element={<CSAMyPaymentsOut />} />
                  <Route path="/csa/analytics" element={<CSAAnalytics />} />
                  <Route path="/csa/reports" element={<CSAReports />} />
                  <Route path="/csa/claims" element={<CSAClaims />} />
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
