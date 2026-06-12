import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, IndianRupee, AlertCircle, TrendingUp, Ban, CheckCircle2, Plus, X, Eye, Key, PieChart as PieChartIcon, BarChart3, Download, Package, Users, RefreshCw, CreditCard, Shield } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const API_URL = import.meta.env.VITE_API_URL

function SuperAdminDashboard({ view = 'dashboard' }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [globalStats, setGlobalStats] = useState({
    totalActiveDistributors: 0,
    totalSales: 0,
    totalClaims: 0
  })
  const [distributors, setDistributors] = useState([])
  const [admins, setAdmins] = useState([])
  const [csas, setCsas] = useState([])
  const [distributorRanking, setDistributorRanking] = useState([])
  const [adminPerformance, setAdminPerformance] = useState([])
  const [csaPerformance, setCsaPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [changingAdminDistributor, setChangingAdminDistributor] = useState(null)
  const [newAdminId, setNewAdminId] = useState('')
  const [changingAdminLoading, setChangingAdminLoading] = useState(false)
  const [changingCsaDistributor, setChangingCsaDistributor] = useState(null)
  const [newCsaId, setNewCsaId] = useState('')
  const [changingCsaLoading, setChangingCsaLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    gstIn: '',
    ownerPassword: '',
    adminId: '',
    csaId: ''
  })
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [csaForm, setCsaForm] = useState({
    name: '',
    email: '',
    password: '',
    adminId: '',
    phone: '',
    gstin: '',
    city: ''
  })
  // Edit CSA state
  const [editingCsa, setEditingCsa] = useState(null)
  const [editCsaForm, setEditCsaForm] = useState({
    name: '',
    email: '',
    adminId: '',
    phone: '',
    gstin: '',
    city: '',
    password: ''
  })
  const [editCsaLoading, setEditCsaLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  
  const [dateFilter, setDateFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [createUserType, setCreateUserType] = useState('distributor')

  useEffect(() => {
    const type = localStorage.getItem('createUserType')
    if (type) {
      setCreateUserType(type)
      localStorage.removeItem('createUserType')
    }
  }, [])

  const getDateRange = (filter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (filter) {
      case 'this-week':
        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        }
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        }
      case 'this-year':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        return {
          start: yearStart.toISOString().split('T')[0],
          end: yearEnd.toISOString().split('T')[0]
        }
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        }
      default:
        return {
          start: null,
          end: null
        }
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [dateFilter, customStartDate, customEndDate])

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true)
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange(dateFilter)
      let queryParams = ''
      const params = new URLSearchParams()
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)
      if (params.toString()) queryParams = '?' + params.toString()
      
      const [statsRes, rankingRes, distributorsRes, adminsRes, csasRes, adminPerfRes, csaPerfRes] = await Promise.all([
        fetch(`${API_URL}/superadmin/reports/global${queryParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/reports/distributor-ranking${queryParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/distributors${queryParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/admins`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/csas`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/reports/admin-performance${queryParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/superadmin/reports/csa-performance${queryParams}`, { headers: getAuthHeaders() })
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setGlobalStats(data)
      }

      if (rankingRes.ok) {
        const data = await rankingRes.json()
        setDistributorRanking(data)
      }

      if (distributorsRes.ok) {
        const data = await distributorsRes.json()
        setDistributors(data)
      }

      if (adminsRes.ok) {
        const data = await adminsRes.json()
        setAdmins(data)
      }

      if (csasRes.ok) {
        const data = await csasRes.json()
        setCsas(data)
      }

      if (adminPerfRes.ok) {
        const data = await adminPerfRes.json()
        setAdminPerformance(data)
      }

      if (csaPerfRes.ok) {
        const data = await csaPerfRes.json()
        setCsaPerformance(data)
      }
    } catch (err) {
      console.error('Failed to fetch super admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getNum = (val) => {
    if (typeof val === 'number') return val
    if (val?.toNumber) return val.toNumber()
    return parseFloat(val) || 0
  }

  const toggleDistributorStatus = async (distributorId, currentStatus) => {
    try {
      setTogglingId(distributorId)
      const res = await fetch(`${API_URL}/superadmin/distributors/${distributorId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (res.ok) {
        setDistributors(prev => prev.map(d => 
          d.distributorId === distributorId 
            ? { ...d, isActive: !currentStatus } 
            : d
        ))
        setDistributorRanking(prev => prev.map(d => 
          d.distributorId === distributorId 
            ? { ...d, isActive: !currentStatus } 
            : d
        ))
      }
    } catch (err) {
      console.error('Failed to toggle distributor status:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleCreateDistributor = async (e) => {
    e.preventDefault()
    try {
      setCreateLoading(true)
      const res = await fetch(`${API_URL}/superadmin/distributors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(createForm)
      })

      if (res.ok) {
        setCreateForm({
          companyName: '',
          ownerName: '',
          email: '',
          phone: '',
          city: '',
          gstIn: '',
          ownerPassword: '',
          adminId: '',
          csaId: ''
        })
        fetchAllData()
        navigate('/superadmin/dashboard')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create distributor')
      }
    } catch (err) {
      console.error('Failed to create distributor:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    try {
      setCreateLoading(true)
      const res = await fetch(`${API_URL}/superadmin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(adminForm)
      })

      if (res.ok) {
        setAdminForm({
          name: '',
          email: '',
          password: ''
        })
        fetchAllData()
        navigate('/superadmin/dashboard')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create admin')
      }
    } catch (err) {
      console.error('Failed to create admin:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleChangeAdmin = async () => {
    if (!changingAdminDistributor) return
    try {
      setChangingAdminLoading(true)
      const res = await fetch(`${API_URL}/superadmin/distributors/${changingAdminDistributor.distributorId}/change-admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ adminId: newAdminId || null })
      })
      if (res.ok) {
        alert('Admin changed successfully')
        setChangingAdminDistributor(null)
        setNewAdminId('')
        fetchAllData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to change admin')
      }
    } catch (err) {
      console.error('Failed to change admin:', err)
      alert('Failed to change admin')
    } finally {
      setChangingAdminLoading(false)
    }
  }

  const handleCreateCSA = async (e) => {
    e.preventDefault()
    try {
      setCreateLoading(true)
      const res = await fetch(`${API_URL}/superadmin/csas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(csaForm)
      })

      if (res.ok) {
        setCsaForm({
          name: '',
          email: '',
          password: '',
          adminId: '',
          phone: '',
          gstin: '',
          city: ''
        })
        fetchAllData()
        navigate('/superadmin/dashboard')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create CSA')
      }
    } catch (err) {
      console.error('Failed to create CSA:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle edit CSA
  const handleEditCSA = async (e) => {
    e.preventDefault()
    if (!editingCsa) return
    try {
      setEditCsaLoading(true)
      const res = await fetch(`${API_URL}/superadmin/csas/${editingCsa.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(editCsaForm)
      })
      if (res.ok) {
        setEditingCsa(null)
        fetchAllData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update CSA')
      }
    } catch (err) {
      console.error('Failed to update CSA:', err)
    } finally {
      setEditCsaLoading(false)
    }
  }

  const handleChangeCSA = async () => {
    if (!changingCsaDistributor) return
    try {
      setChangingCsaLoading(true)
      const res = await fetch(`${API_URL}/superadmin/distributors/${changingCsaDistributor.distributorId}/change-csa`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ csaId: newCsaId || null })
      })
      if (res.ok) {
        alert('CSA changed successfully')
        setChangingCsaDistributor(null)
        setNewCsaId('')
        fetchAllData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to change CSA')
      }
    } catch (err) {
      console.error('Failed to change CSA:', err)
      alert('Failed to change CSA')
    } finally {
      setChangingCsaLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!selectedDistributor) return
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    try {
      setPasswordLoading(true)
      const res = await fetch(`${API_URL}/superadmin/distributors/${selectedDistributor.distributorId}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ newPassword: passwordForm.newPassword })
      })
      if (res.ok) {
        alert('Password changed successfully')
        setShowPasswordModal(false)
        setSelectedDistributor(null)
        setPasswordForm({ newPassword: '', confirmPassword: '' })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to change password')
      }
    } catch (err) {
      console.error('Failed to change password:', err)
      alert('Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const downloadAllDistributorsReport = () => {
    const activeCount = distributors.filter(d => d.isActive !== false).length
    const suspendedCount = distributors.length - activeCount
    const totalRevenueAll = distributors.reduce((sum, d) => sum + getNum(d.totalRevenue), 0)
    const avgRevenue = distributors.length > 0 ? totalRevenueAll / distributors.length : 0
    const avgInvoices = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.invoiceCount || 0), 0) / distributors.length : 0
    const avgParties = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.partyCount || 0), 0) / distributors.length : 0
    const avgProducts = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.productCount || 0), 0) / distributors.length : 0
    const avgSalesReturns = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.salesReturnCount || 0), 0) / distributors.length : 0
    const avgPaymentsIn = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.paymentInCount || 0), 0) / distributors.length : 0
    const avgPurchaseReturns = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.purchaseReturnCount || 0), 0) / distributors.length : 0
    const avgPaymentsOut = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.paymentOutCount || 0), 0) / distributors.length : 0
    const avgClaims = distributors.length > 0 ? distributors.reduce((sum, d) => sum + (d.claimCount || 0), 0) / distributors.length : 0

    const getPerformanceTier = (revenue) => {
      if (revenue >= avgRevenue * 1.5) return 'Top Performer'
      if (revenue >= avgRevenue * 0.8) return 'Good Performer'
      if (revenue >= avgRevenue * 0.5) return 'Average Performer'
      return 'Needs Attention'
    }

    const summaryHeaders = ['Metric', 'Value']
    const summaryRows = [
      ['Report Generated On', new Date().toLocaleString()],
      ['Total Distributors', distributors.length],
      ['Active Distributors', activeCount],
      ['Suspended Distributors', suspendedCount],
      ['Active Rate', `${distributors.length > 0 ? Math.round((activeCount / distributors.length) * 100) : 0}%`],
      ['Total Global Revenue', `₹${totalRevenueAll.toLocaleString()}`],
      ['Average Revenue per Distributor', `₹${Math.round(avgRevenue).toLocaleString()}`],
      ['Average Invoices per Distributor', Math.round(avgInvoices).toLocaleString()],
      ['Average Parties per Distributor', Math.round(avgParties).toLocaleString()],
      ['Average Products per Distributor', Math.round(avgProducts).toLocaleString()],
      ['Average Sales Returns per Distributor', Math.round(avgSalesReturns).toLocaleString()],
      ['Average Payments Received per Distributor', Math.round(avgPaymentsIn).toLocaleString()],
      ['Average Purchase Returns per Distributor', Math.round(avgPurchaseReturns).toLocaleString()],
      ['Average Payments Out per Distributor', Math.round(avgPaymentsOut).toLocaleString()],
      ['Average Claims per Distributor', Math.round(avgClaims).toLocaleString()]
    ]

    const detailHeaders = [
      'Rank',
      'Company Name',
      'Owner Name',
      'Email',
      'Phone',
      'City',
      'GSTIN',
      'Status',
      'Performance Tier',
      'Total Revenue',
      'Revenue vs Average',
      'Invoice Count',
      'Party Count',
      'Product Count',
      'Sales Return Count',
      'Payments Received Count',
      'Purchase Return Count',
      'Payments Out Count',
      'Claim Count'
    ]

    const sortedDistributors = [...distributors].sort((a, b) => getNum(b.totalRevenue) - getNum(a.totalRevenue))
    const detailRows = sortedDistributors.map((d, index) => {
      const revenue = getNum(d.totalRevenue)
      const revenueVsAvg = avgRevenue > 0 ? Math.round(((revenue - avgRevenue) / avgRevenue) * 100) : 0
      return [
        index + 1,
        d.companyName,
        d.ownerName,
        d.email,
        d.phone,
        d.city,
        d.gstIn,
        d.isActive !== false ? 'Active' : 'Suspended',
        getPerformanceTier(revenue),
        `₹${revenue.toLocaleString()}`,
        `${revenueVsAvg > 0 ? '+' : ''}${revenueVsAvg}%`,
        d.invoiceCount,
        d.partyCount,
        d.productCount,
        d.salesReturnCount,
        d.paymentInCount,
        d.purchaseReturnCount,
        d.paymentOutCount,
        d.claimCount
      ]
    })

    let csvContent = ''
    csvContent += '===== OVERALL PERFORMANCE SUMMARY =====\n'
    csvContent += summaryHeaders.join(',') + '\n'
    summaryRows.forEach(row => { csvContent += row.join(',') + '\n' })
    csvContent += '\n'
    csvContent += '===== DETAILED DISTRIBUTOR ANALYSIS =====\n'
    csvContent += detailHeaders.join(',') + '\n'
    detailRows.forEach(row => { csvContent += row.join(',') + '\n' })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `overall_performance_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadDistributorReport = (distributor) => {
    const revenue = getNum(distributor.totalRevenue)
    const totalRevenueAll = distributors.reduce((sum, d) => sum + getNum(d.totalRevenue), 0)
    const avgRevenue = distributors.length > 0 ? totalRevenueAll / distributors.length : 0
    const sortedDistributors = [...distributors].sort((a, b) => getNum(b.totalRevenue) - getNum(a.totalRevenue))
    const rank = sortedDistributors.findIndex(d => d.distributorId === distributor.distributorId) + 1
    const totalDistributors = distributors.length
    const marketShare = totalRevenueAll > 0 ? Math.round((revenue / totalRevenueAll) * 100) : 0
    const revenueVsAvg = avgRevenue > 0 ? Math.round(((revenue - avgRevenue) / avgRevenue) * 100) : 0

    const getPerformanceTier = (rev) => {
      if (rev >= avgRevenue * 1.5) return 'Top Performer'
      if (rev >= avgRevenue * 0.8) return 'Good Performer'
      if (rev >= avgRevenue * 0.5) return 'Average Performer'
      return 'Needs Attention'
    }

    const summaryHeaders = ['Metric', 'Value']
    const summaryRows = [
      ['Report Generated On', new Date().toLocaleString()],
      ['Company Name', distributor.companyName],
      ['Owner Name', distributor.ownerName],
      ['Email', distributor.email],
      ['Phone', distributor.phone],
      ['City', distributor.city],
      ['GSTIN', distributor.gstIn],
      ['Status', distributor.isActive !== false ? 'Active' : 'Suspended'],
      ['', ''],
      ['=== PERFORMANCE METRICS ===', ''],
      ['Rank', `${rank} / ${totalDistributors}`],
      ['Performance Tier', getPerformanceTier(revenue)],
      ['Total Revenue', `₹${revenue.toLocaleString()}`],
      ['Market Share', `${marketShare}%`],
      ['Revenue vs Average', `${revenueVsAvg > 0 ? '+' : ''}${revenueVsAvg}%`],
      ['Invoice Count', distributor.invoiceCount],
      ['Party Count', distributor.partyCount],
      ['Product Count', distributor.productCount],
      ['Sales Return Count', distributor.salesReturnCount],
      ['Payments Received Count', distributor.paymentInCount],
      ['Purchase Return Count', distributor.purchaseReturnCount],
      ['Payments Out Count', distributor.paymentOutCount],
      ['Claim Count', distributor.claimCount]
    ]

    let csvContent = ''
    csvContent += '===== DISTRIBUTOR PERFORMANCE REPORT =====\n'
    csvContent += summaryHeaders.join(',') + '\n'
    summaryRows.forEach(row => { csvContent += row.join(',') + '\n' })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${distributor.companyName.replace(/\s+/g, '_')}_detailed_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderDashboard = () => {
    const activeCount = distributors.filter(d => d.isActive !== false).length
    const suspendedCount = distributors.length - activeCount

    // Calculate global stats from all distributors
    const totalParties = distributors.reduce((sum, d) => sum + (d.partyCount || 0), 0)
    const totalProducts = distributors.reduce((sum, d) => sum + (d.productCount || 0), 0)
    const totalSales = distributors.reduce((sum, d) => sum + getNum(d.totalSales), 0)
    const totalSalesReturns = distributors.reduce((sum, d) => sum + getNum(d.totalSalesReturns), 0)
    const totalRevenue = totalSales - totalSalesReturns
    const totalPaymentsReceived = distributors.reduce((sum, d) => sum + getNum(d.totalPaymentsReceived), 0)
    const totalPurchaseReturns = distributors.reduce((sum, d) => sum + getNum(d.totalPurchaseReturns), 0)
    const totalPaymentsOut = distributors.reduce((sum, d) => sum + getNum(d.totalPaymentsOut), 0)
    const pendingPayments = totalRevenue - totalPaymentsReceived

    const statusChartData = {
      labels: ['Active', 'Suspended'],
      datasets: [
        {
          data: [activeCount, suspendedCount],
          backgroundColor: [
            '#10B981',
            '#EF4444'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    }

    const distributorSalesChartData = {
      labels: distributorRanking.slice(0, 10).map(d => d.companyName),
      datasets: [
        {
          label: 'Total Revenue',
          data: distributorRanking.slice(0, 10).map(d => getNum(d.totalRevenue)),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(99, 102, 241, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(34, 197, 94, 0.8)'
          ],
          borderColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#8B5CF6',
            '#EC4899',
            '#EF4444',
            '#6366F1',
            '#8B5CF6',
            '#EAB308',
            '#22C55E'
          ],
          borderWidth: 2
        }
      ]
    }

    const barChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }

    const pieChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }

    // Get top performers
    const topAdmins = adminPerformance.slice(0, 5)
    const topCsas = csaPerformance.slice(0, 5)
    const topDistributors = distributorRanking.slice(0, 5)

    return (
      <>
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            Super Admin Command Center <span className="text-xs md:text-sm text-blue-500 font-semibold bg-blue-100 px-2 md:px-3 py-1 rounded-full">GLOBAL</span>
          </h1>
        </div>
        
        {/* Date Filter and Download Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <label className="text-sm font-semibold text-gray-700">Filter by Date:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Time</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="this-year">This Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            {!loading && distributorRanking.length > 0 && (
              <button
                onClick={downloadAllDistributorsReport}
                className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-green-600 text-white text-sm md:text-base font-medium rounded-lg md:rounded-xl hover:bg-green-700 transition-all w-full md:w-auto"
              >
                <Download size={16} className="md:w-5 md:h-5" />
                Download All Report
              </button>
            )}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-col md:flex-row gap-4 mt-4 items-start md:items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-gray-500 text-sm font-medium">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
        </div>

        {/* Global Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
          {/* Total Admins */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Shield size={20} className="md:w-8 md:h-8 text-indigo-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total Admins</p>
              <p className="text-xl md:text-3xl font-bold text-indigo-600 mt-2">{loading ? '...' : admins.length}</p>
            </div>
          </div>

          {/* Total CSAs */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Users size={20} className="md:w-8 md:h-8 text-purple-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total CSAs</p>
              <p className="text-xl md:text-3xl font-bold text-purple-600 mt-2">{loading ? '...' : csas.length}</p>
            </div>
          </div>

          {/* Total Parties */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Users size={20} className="md:w-8 md:h-8 text-blue-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total Parties</p>
              <p className="text-xl md:text-3xl font-bold text-blue-600 mt-2">{loading ? '...' : totalParties}</p>
            </div>
          </div>

          {/* Products in Stock */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <Package size={20} className="md:w-8 md:h-8 text-orange-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Products in Stock</p>
              <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">{loading ? '...' : totalProducts}</p>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <IndianRupee size={20} className="md:w-8 md:h-8 text-yellow-700" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Total Revenue</p>
              <p className="text-xl md:text-3xl font-bold text-yellow-700 mt-2">₹{loading ? '...' : totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Sales Returns */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <RefreshCw size={20} className="md:w-8 md:h-8 text-red-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Sales Returns</p>
              <p className="text-xl md:text-3xl font-bold text-red-600 mt-2">₹{loading ? '...' : totalSalesReturns.toLocaleString()}</p>
            </div>
          </div>

          {/* Purchase Returns */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <RefreshCw size={20} className="md:w-8 md:h-8 text-cyan-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Purchase Returns</p>
              <p className="text-xl md:text-3xl font-bold text-cyan-600 mt-2">₹{loading ? '...' : totalPurchaseReturns.toLocaleString()}</p>
            </div>
          </div>

          {/* Payments Received */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <CreditCard size={20} className="md:w-8 md:h-8 text-green-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Received</p>
              <p className="text-xl md:text-3xl font-bold text-green-600 mt-2">₹{loading ? '...' : totalPaymentsReceived.toLocaleString()}</p>
            </div>
          </div>

          {/* Payments Out */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-rose-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <RefreshCw size={20} className="md:w-8 md:h-8 text-rose-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Payments Out</p>
              <p className="text-xl md:text-3xl font-bold text-rose-600 mt-2">₹{loading ? '...' : totalPaymentsOut.toLocaleString()}</p>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-xl md:rounded-3xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
                <IndianRupee size={20} className="md:w-8 md:h-8 text-orange-600" />
              </div>
              <p className="text-sm md:text-lg font-semibold text-gray-800">Pending Payments</p>
              <p className="text-xl md:text-3xl font-bold text-orange-600 mt-2">₹{loading ? '...' : Math.max(0, pendingPayments).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Admins and CSAs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* All Admins */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">All Admins</h3>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : admins.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No admins yet</div>
              ) : (
                admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{admin.name}</p>
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* All CSAs */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-purple-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">All CSAs</h3>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : csas.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No CSAs yet</div>
              ) : (
                csas.map((csa) => (
                  <div key={csa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{csa.name}</p>
                      <p className="text-xs text-gray-500">{csa.email}</p>
                      {csa.phone && <p className="text-xs text-gray-500">Phone: {csa.phone}</p>}
                      {csa.gstin && <p className="text-xs text-gray-500">GSTIN: {csa.gstin}</p>}
                      {csa.city && <p className="text-xs text-gray-500">City: {csa.city}</p>}
                    </div>
                    <button
                      onClick={() => {
                        setEditingCsa(csa)
                        setEditCsaForm({
                          name: csa.name,
                          email: csa.email,
                          adminId: csa.adminId || '',
                          phone: csa.phone || '',
                          gstin: csa.gstin || '',
                          city: csa.city || '',
                          password: ''
                        })
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-all"
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Performers - Admin, CSA, Distributors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Admins */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Top Admins by Performance</h3>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : topAdmins.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No admins yet</div>
              ) : (
                topAdmins.map((admin, index) => (
                  <div key={admin.adminId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.distributorCount} Distributors</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{getNum(admin.totalRevenue).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top CSAs */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-purple-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Top CSAs by Performance</h3>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : topCsas.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No CSAs yet</div>
              ) : (
                topCsas.map((csa, index) => (
                  <div key={csa.csaId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-semibold text-purple-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{csa.name}</p>
                        <p className="text-xs text-gray-500">{csa.distributorCount} Distributors</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{getNum(csa.totalRevenue).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Distributors */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="text-green-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Top Distributors by Sales</h3>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : topDistributors.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No distributors yet</div>
              ) : (
                topDistributors.map((dist, index) => (
                  <div key={dist.distributorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 truncate max-w-[140px]">{dist.companyName}</p>
                        <p className="text-xs text-gray-500">{dist.invoiceCount || 0} Invoices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{getNum(dist.totalRevenue).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Distributor Sales Bar Chart */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Top 10 Distributors by Sales</h3>
            </div>
            <div className="h-64">
              <Bar data={distributorSalesChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Active vs Suspended Pie Chart */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="text-green-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">Active vs Suspended</h3>
            </div>
            <div className="h-64">
              <Pie data={statusChartData} options={pieChartOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Distributor Directory Table (Summary) */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 md:px-8 md:py-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Building2 size={20} /> Distributors (Summary)
              </h3>
              <button
                onClick={() => navigate('/superadmin/directory')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="p-4 md:p-6">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : distributors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No distributors yet</div>
              ) : (
                <div className="space-y-3">
                  {distributors.slice(0, 5).map((distributor, index) => (
                    <div key={distributor.distributorId || index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{distributor.companyName}</div>
                        <div className="text-sm text-gray-600">{distributor.ownerName}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          distributor.isActive !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {distributor.isActive !== false ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                          {distributor.isActive !== false ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderDirectory = () => {
    // Group distributors by adminId, then by csaId
    const structure = {}; // { adminId: { csas: { csaId: [] }, unassigned: [] } }
    const unassignedAdmins = []; // distributors with no admin
    
    if (!loading && distributors.length > 0) {
      distributors.forEach(dist => {
        if (dist.adminId) {
          if (!structure[dist.adminId]) {
            structure[dist.adminId] = { csas: {}, unassigned: [] };
          }
          if (dist.csaId) {
            if (!structure[dist.adminId].csas[dist.csaId]) {
              structure[dist.adminId].csas[dist.csaId] = [];
            }
            structure[dist.adminId].csas[dist.csaId].push(dist);
          } else {
            structure[dist.adminId].unassigned.push(dist);
          }
        } else {
          unassignedAdmins.push(dist);
        }
      });
    }
    
    const renderDistributorRow = (distributor, index, pl = 12) => {
      const currentAdmin = admins.find(a => a.id === distributor.adminId)
      const currentCsa = csas.find(c => c.id === distributor.csaId)
      return (
        <tr key={distributor.distributorId || index} className="hover:bg-gray-50 transition-colors bg-gray-50/50">
          <td className="px-6 py-4" style={{ paddingLeft: `${pl}px` }}>
            <div className="font-semibold text-gray-900">{distributor.companyName}</div>
            <div className="flex gap-2 text-xs text-gray-500 mt-1">
              {currentAdmin && <span>Admin: {currentAdmin.name}</span>}
              {currentCsa && <span>CSA: {currentCsa.name}</span>}
            </div>
          </td>
        <td className="px-6 py-4">
          <span className="text-gray-700">{distributor.ownerName}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-gray-700 font-mono text-sm">{distributor.email}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-gray-700">{distributor.city}</span>
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            distributor.isActive !== false 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {distributor.isActive !== false ? <CheckCircle2 size={12} /> : <Ban size={12} />}
            {distributor.isActive !== false ? 'Active' : 'Suspended'}
          </span>
        </td>
        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/superadmin/distributor/${distributor.distributorId}`)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center"
            title="View"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => {
              const distributorWithSales = distributorRanking.find(d => d.distributorId === distributor.distributorId)
              downloadDistributorReport(distributorWithSales || distributor)
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-all flex items-center"
            title="Download Report"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => {
              setSelectedDistributor(distributor)
              setShowPasswordModal(true)
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all flex items-center"
            title="Change Password"
          >
            <Key size={18} />
          </button>
          <button
            onClick={() => {
              setChangingAdminDistributor(distributor)
              setNewAdminId(distributor.adminId || '')
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-all flex items-center"
            title="Change Admin"
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => {
              setChangingCsaDistributor(distributor)
              setNewCsaId(distributor.csaId || '')
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all flex items-center"
            title="Change CSA"
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => toggleDistributorStatus(distributor.distributorId, distributor.isActive !== false)}
            disabled={togglingId === distributor.distributorId}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              distributor.isActive !== false
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
            title={distributor.isActive !== false ? 'Suspend Distributor' : 'Activate Distributor'}
          >
            {togglingId === distributor.distributorId 
              ? '...' 
              : (distributor.isActive !== false ? <Ban size={18} /> : <CheckCircle2 size={18} />)
            }
          </button>
        </td>
      </tr>
      )
    };
    
    const renderAdminSection = (admin, data) => (
      <React.Fragment key={`admin-section-${admin.id}`}>
        {/* Admin Row */}
        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200">
          <td colSpan="6" className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{admin.name}</h3>
                <p className="text-sm text-gray-600">{admin.email}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-full">
                  {Object.keys(data.csas).length} CSAs
                </span>
                <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-full">
                  {Object.values(data.csas).flat().length + data.unassigned.length} Distributors
                </span>
              </div>
            </div>
          </td>
        </tr>
        {/* CSAs Under Admin */}
        {Object.entries(data.csas).map(([csaId, dists]) => {
          const csa = csas.find(c => c.id === csaId);
          return (
            <React.Fragment key={`csa-section-${csaId}`}>
              <tr className="bg-gradient-to-r from-cyan-50 to-teal-50">
                <td colSpan="6" className="px-6 py-3">
                  <div className="flex items-center gap-2 pl-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-teal-700 rounded-full flex items-center justify-center">
                      <Users size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{csa?.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        <p className="text-xs text-gray-600">{csa?.email}</p>
                        {csa?.phone && <p className="text-xs text-gray-600">Phone: {csa.phone}</p>}
                        {csa?.gstin && <p className="text-xs text-gray-600">GSTIN: {csa.gstin}</p>}
                        {csa?.city && <p className="text-xs text-gray-600">City: {csa.city}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded-full">
                        {dists.length} Distributors
                      </span>
                      <button
                        onClick={() => {
                          setEditingCsa(csa)
                          setEditCsaForm({
                            name: csa.name,
                            email: csa.email,
                            adminId: csa.adminId || '',
                            phone: csa.phone || '',
                            gstin: csa.gstin || '',
                            city: csa.city || '',
                            password: ''
                          })
                        }}
                        className="text-xs font-medium bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full hover:bg-cyan-200 transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              {dists.map((dist, idx) => renderDistributorRow(dist, idx, 48))}
            </React.Fragment>
          )
        })}
        {/* Unassigned to CSA (but assigned to Admin) */}
        {data.unassigned.length > 0 && (
          <>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
              <td colSpan="6" className="px-6 py-3">
                <div className="flex items-center gap-2 pl-8">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                    <Package size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Unassigned to CSA</h4>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded-full">
                    {data.unassigned.length} Distributors
                  </span>
                </div>
              </td>
            </tr>
            {data.unassigned.map((dist, idx) => renderDistributorRow(dist, idx, 48))}
          </>
        )}
      </React.Fragment>
    );

    return (
      <>
        <div className="mb-6 md:mb-8 flex flex-col gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            Distributor Directory
          </h1>
          
          {!loading && distributorRanking.length > 0 && (
            <button
              onClick={downloadAllDistributorsReport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all w-full md:w-auto"
            >
              <Download size={16} />
              Download All Report
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company / Admin</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Login Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : distributors.length === 0 && admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No distributors or admins yet</td>
                  </tr>
                ) : (
                  <>
                    {/* Render Admins with their CSAs and Distributors */}
                    {admins.map(admin => {
                      const adminData = structure[admin.id] || { csas: {}, unassigned: [] };
                      return renderAdminSection(admin, adminData);
                    })}
                    
                    {/* Render Unassigned Distributors */}
                    {unassignedAdmins.length > 0 && (
                      <>
                        <tr key="unassigned" className="bg-gradient-to-r from-yellow-50 to-orange-50 border-t border-gray-200">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-full flex items-center justify-center">
                                <Package size={20} className="text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">Unassigned Distributors</h3>
                                <p className="text-sm text-gray-600">Distributors not assigned to any admin</p>
                              </div>
                              <span className="ml-auto text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-full">
                                {unassignedAdmins.length} Distributors
                              </span>
                            </div>
                          </td>
                        </tr>
                        {unassignedAdmins.map((dist, idx) => renderDistributorRow(dist, idx))}
                      </>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  const renderCreate = () => (
    <>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          Create New {createUserType === 'admin' ? 'Admin' : createUserType === 'csa' ? 'CSA' : 'Distributor'}
        </h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setCreateUserType('admin')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              createUserType === 'admin'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Create Admin
          </button>
          <button
            onClick={() => setCreateUserType('csa')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              createUserType === 'csa'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Create CSA
          </button>
          <button
            onClick={() => setCreateUserType('distributor')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              createUserType === 'distributor'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Create Distributor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-100 p-4 md:p-6 lg:p-8">
        {createUserType === 'admin' ? (
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter admin name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter admin email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter password (min 6 characters)"
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/superadmin/dashboard')}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 rounded-xl font-medium transition shadow-lg disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </form>
        ) : createUserType === 'csa' ? (
          <form onSubmit={handleCreateCSA} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={csaForm.name}
                  onChange={(e) => setCsaForm({ ...csaForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter CSA name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={csaForm.email}
                  onChange={(e) => setCsaForm({ ...csaForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter CSA email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={csaForm.password}
                  onChange={(e) => setCsaForm({ ...csaForm, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter CSA password (min 6 chars)"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={csaForm.phone}
                  onChange={(e) => setCsaForm({ ...csaForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                <input
                  type="text"
                  value={csaForm.gstin}
                  onChange={(e) => setCsaForm({ ...csaForm, gstin: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter GSTIN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={csaForm.city}
                  onChange={(e) => setCsaForm({ ...csaForm, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Admin</label>
                <select
                  value={csaForm.adminId}
                  onChange={(e) => setCsaForm({ ...csaForm, adminId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select Admin (Optional)</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={createLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-teal-700 transition-all disabled:opacity-50"
            >
              {createLoading ? 'Creating...' : 'Create CSA'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateDistributor} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  required
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                <input
                  type="text"
                  required
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter owner name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter login email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner Password</label>
                <input
                  type="password"
                  required
                  value={createForm.ownerPassword}
                  onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter password (min 6 chars)"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  required
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                <input
                  type="text"
                  required
                  value={createForm.gstIn}
                  onChange={(e) => setCreateForm({ ...createForm, gstIn: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter GSTIN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Admin</label>
                <select
                  value={createForm.adminId}
                  onChange={(e) => setCreateForm({ ...createForm, adminId: e.target.value, csaId: '' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select Admin (Optional)</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to CSA</label>
                <select
                  value={createForm.csaId}
                  onChange={(e) => setCreateForm({ ...createForm, csaId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select CSA (Optional)</option>
                  {csas
                    .filter(csa => csa.adminId === createForm.adminId)
                    .map(csa => (
                      <option key={csa.id} value={csa.id}>{csa.name} ({csa.email})</option>
                    ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={createLoading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {createLoading ? 'Creating...' : 'Create Distributor'}
            </button>
          </form>
        )}
      </div>
    </>
  );

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return renderDashboard()
      case 'directory': return renderDirectory()
      case 'create': return renderCreate()
      default: return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {renderContent()}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
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

      {/* Change Admin Modal */}
      {changingAdminDistributor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Change Admin</h2>
              <button
                onClick={() => {
                  setChangingAdminDistributor(null)
                  setNewAdminId('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-700">
                  Distributor: <span className="font-semibold">{changingAdminDistributor.companyName}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Admin</label>
                <select
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Unassigned</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangingAdminDistributor(null)
                    setNewAdminId('')
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to change the admin for this distributor?')) {
                      handleChangeAdmin()
                    }
                  }}
                  disabled={changingAdminLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 rounded-xl font-medium transition"
                >
                  {changingAdminLoading ? 'Changing...' : 'Change Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change CSA Modal */}
      {changingCsaDistributor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Change CSA</h2>
              <button
                onClick={() => {
                  setChangingCsaDistributor(null)
                  setNewCsaId('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-700">
                  Distributor: <span className="font-semibold">{changingCsaDistributor.companyName}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select CSA</label>
                <select
                  value={newCsaId}
                  onChange={(e) => setNewCsaId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Unassigned</option>
                  {csas
                    .filter(csa => csa.adminId === changingCsaDistributor.adminId)
                    .map(csa => (
                      <option key={csa.id} value={csa.id}>{csa.name} ({csa.email})</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangingCsaDistributor(null)
                    setNewCsaId('')
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                                if (confirm('Are you sure you want to change the CSA for this distributor?')) {
                                  handleChangeCSA()
                                }
                              }}
                  disabled={changingCsaLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 rounded-xl font-medium transition"
                >
                  {changingCsaLoading ? 'Changing...' : 'Change CSA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit CSA Modal */}
      {editingCsa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit CSA</h2>
              <button
                onClick={() => setEditingCsa(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditCSA} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={editCsaForm.name}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={editCsaForm.email}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editCsaForm.phone}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                  <input
                    type="text"
                    value={editCsaForm.gstin}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, gstin: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={editCsaForm.city}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Admin</label>
                  <select
                    value={editCsaForm.adminId}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, adminId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select Admin (Optional)</option>
                    {admins.map(admin => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password (optional)</label>
                  <input
                    type="password"
                    value={editCsaForm.password}
                    onChange={(e) => setEditCsaForm({ ...editCsaForm, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Leave empty to keep current password"
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCsa(null)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editCsaLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 rounded-xl font-medium transition"
                >
                  {editCsaLoading ? 'Updating...' : 'Update CSA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminDashboard
