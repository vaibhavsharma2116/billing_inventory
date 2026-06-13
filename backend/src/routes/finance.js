const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth')
const router = express.Router()

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

// Helper function to calculate distributor financials
const calculateDistributorFinancials = (distributor) => {
  // Calculate all financial metrics
  const totalCompanyDebits = distributor.purchaseLedgers.reduce((sum, pl) => sum + getNum(pl.totalAmount), 0)
  const totalAmountRealized = distributor.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
  
  let totalStockCost = 0
  distributor.invoices.forEach(inv => {
    inv.invoiceItems.forEach(item => {
      if (item.costPrice) {
        totalStockCost += item.qty * getNum(item.costPrice)
      }
    })
  })

  const totalDistributorProfit = totalAmountRealized - totalStockCost
  const pendingCompanyBalance = totalCompanyDebits - totalAmountRealized

  // Additional metrics
  const totalSalesReturns = distributor.salesReturns.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0)
  const totalPurchaseReturns = distributor.purchaseReturns.reduce((sum, pr) => sum + getNum(pr.grandTotal), 0)
  const totalPaymentsIn = distributor.paymentsIn.reduce((sum, pi) => sum + getNum(pi.amount), 0)
  const totalPaymentsOut = distributor.paymentsOut.reduce((sum, po) => sum + getNum(po.amount), 0)
  const totalPendingClaims = distributor.claims.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + getNum(c.amount), 0)
  const totalApprovedClaims = distributor.claims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + getNum(c.amount), 0)
  const totalPaidClaims = distributor.claims.filter(c => c.status === 'PAID').reduce((sum, c) => sum + getNum(c.amount), 0)

  return {
    distributorId: distributor.id,
    companyName: distributor.companyName,
    ownerName: distributor.ownerName,
    email: distributor.email,
    phone: distributor.phone,
    gstIn: distributor.gstIn,
    city: distributor.city,
    isActive: distributor.isActive,
    createdAt: distributor.createdAt,
    updatedAt: distributor.updatedAt,
    
    // Core financials
    totalCompanyDebits,
    totalAmountRealized,
    totalStockCost,
    totalDistributorProfit,
    pendingCompanyBalance,
    
    // Additional metrics
    totalSalesReturns,
    totalPurchaseReturns,
    totalPaymentsIn,
    totalPaymentsOut,
    totalPendingClaims,
    totalApprovedClaims,
    totalPaidClaims,
    
    // Counts
    invoiceCount: distributor.invoices.length,
    purchaseCount: distributor.purchaseLedgers.length,
    salesReturnCount: distributor.salesReturns.length,
    purchaseReturnCount: distributor.purchaseReturns.length,
    paymentInCount: distributor.paymentsIn.length,
    paymentOutCount: distributor.paymentsOut.length,
    partyCount: distributor.parties.length,
    productCount: distributor.products.length,
    claimCount: distributor.claims.length
  }
}

// Helper to sum totals from an array of financial objects
const sumTotals = (items) => {
  if (items.length === 0) return {}
  // Use first item as base
  const base = { ...items[0] }
  // Sum from second item onwards
  for (let i = 1; i < items.length; i++) {
    const item = items[i]
    base.totalCompanyDebits = (base.totalCompanyDebits || 0) + (item.totalCompanyDebits || 0)
    base.totalAmountRealized = (base.totalAmountRealized || 0) + (item.totalAmountRealized || 0)
    base.totalStockCost = (base.totalStockCost || 0) + (item.totalStockCost || 0)
    base.totalDistributorProfit = (base.totalDistributorProfit || 0) + (item.totalDistributorProfit || 0)
    base.totalPendingCompanyBalance = (base.totalPendingCompanyBalance || 0) + (item.totalPendingCompanyBalance || 0)
    base.totalSalesReturns = (base.totalSalesReturns || 0) + (item.totalSalesReturns || 0)
    base.totalPurchaseReturns = (base.totalPurchaseReturns || 0) + (item.totalPurchaseReturns || 0)
    base.totalPaymentsIn = (base.totalPaymentsIn || 0) + (item.totalPaymentsIn || 0)
    base.totalPaymentsOut = (base.totalPaymentsOut || 0) + (item.totalPaymentsOut || 0)
    base.totalPendingClaims = (base.totalPendingClaims || 0) + (item.totalPendingClaims || 0)
    base.totalApprovedClaims = (base.totalApprovedClaims || 0) + (item.totalApprovedClaims || 0)
    base.totalPaidClaims = (base.totalPaidClaims || 0) + (item.totalPaidClaims || 0)
    // Don't modify count fields (totalAdmins, totalCsas, totalDistributors)
  }
  return base
}

// Get complete financial overview grouped by Admin -> CSA -> Distributor
router.get('/overview', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    // Fetch all admins, CSAs, and distributors
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        managedCSAs: {
          include: {
            managedCsaDistributors: {
              include: {
                invoices: { include: { invoiceItems: true } },
                purchaseLedgers: true,
                salesReturns: true,
                purchaseReturns: true,
                paymentsIn: true,
                paymentsOut: true,
                claims: true,
                parties: true,
                products: true
              }
            }
          }
        },
        managedDistributors: {
          include: {
            invoices: { include: { invoiceItems: true } },
            purchaseLedgers: true,
            salesReturns: true,
            purchaseReturns: true,
            paymentsIn: true,
            paymentsOut: true,
            claims: true,
            parties: true,
            products: true
          }
        }
      }
    })

    const allCsas = await prisma.user.count({
      where: { role: 'CSA' }
    })

    const allDistributors = await prisma.distributor.count()

    console.log('=== FINANCE OVERVIEW DEBUG ===')
    console.log('Admins found:', admins.length)
    console.log('CSAs found:', allCsas)
    console.log('Distributors found:', allDistributors)

    // Fetch all distributors not assigned to any admin
    const unassignedDistributors = await prisma.distributor.findMany({
      where: { adminId: null },
      include: {
        invoices: { include: { invoiceItems: true } },
        purchaseLedgers: true,
        salesReturns: true,
        purchaseReturns: true,
        paymentsIn: true,
        paymentsOut: true,
        claims: true,
        parties: true,
        products: true
      }
    })

    const groupedData = []
    let overallTotals = {
      totalCompanyDebits: 0,
      totalAmountRealized: 0,
      totalStockCost: 0,
      totalDistributorProfit: 0,
      totalPendingCompanyBalance: 0,
      totalSalesReturns: 0,
      totalPurchaseReturns: 0,
      totalPaymentsIn: 0,
      totalPaymentsOut: 0,
      totalPendingClaims: 0,
      totalApprovedClaims: 0,
      totalPaidClaims: 0,
      totalAdmins: admins.length,
      totalCsas: allCsas,
      totalDistributors: allDistributors
    }

    // Process each admin
    admins.forEach(admin => {
      const adminData = {
        type: 'admin',
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        city: admin.city,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        totals: {
          totalCompanyDebits: 0,
          totalAmountRealized: 0,
          totalStockCost: 0,
          totalDistributorProfit: 0,
          totalPendingCompanyBalance: 0,
          totalSalesReturns: 0,
          totalPurchaseReturns: 0,
          totalPaymentsIn: 0,
          totalPaymentsOut: 0,
          totalPendingClaims: 0,
          totalApprovedClaims: 0,
          totalPaidClaims: 0
        },
        csas: [],
        unassignedDistributors: [] // Distributors directly under admin, no CSA
      }

      // Process CSAs under this admin
      admin.managedCSAs.forEach(csa => {
        const csaData = {
          type: 'csa',
          id: csa.id,
          name: csa.name,
          email: csa.email,
          phone: csa.phone,
          city: csa.city,
          isActive: csa.isActive,
          createdAt: csa.createdAt,
          totals: {
            totalCompanyDebits: 0,
            totalAmountRealized: 0,
            totalStockCost: 0,
            totalDistributorProfit: 0,
            totalPendingCompanyBalance: 0,
            totalSalesReturns: 0,
            totalPurchaseReturns: 0,
            totalPaymentsIn: 0,
            totalPaymentsOut: 0,
            totalPendingClaims: 0,
            totalApprovedClaims: 0,
            totalPaidClaims: 0
          },
          distributors: []
        }

        // Process distributors under this CSA
        csa.managedCsaDistributors.forEach(dist => {
          const distFinancials = calculateDistributorFinancials(dist)
          
          // Add to CSA totals
          csaData.totals = sumTotals([csaData.totals, distFinancials])
          
          csaData.distributors.push(distFinancials)
        })

        // Add CSA data to admin
        adminData.csas.push(csaData)
        
        // Add CSA totals to admin totals
        adminData.totals = sumTotals([adminData.totals, csaData.totals])
      })

      // Process distributors directly under admin (no CSA)
      admin.managedDistributors.forEach(dist => {
        const distFinancials = calculateDistributorFinancials(dist)
        
        // Add to admin totals
        adminData.totals = sumTotals([adminData.totals, distFinancials])

        adminData.unassignedDistributors.push(distFinancials)
      })

      // Add admin totals to overall totals
      overallTotals = sumTotals([overallTotals, adminData.totals])

      groupedData.push(adminData)
    })

    // Process unassigned distributors (no admin)
    if (unassignedDistributors.length > 0) {
      const unassignedData = {
        type: 'unassigned',
        name: 'Unassigned Distributors',
        totals: {
          totalCompanyDebits: 0,
          totalAmountRealized: 0,
          totalStockCost: 0,
          totalDistributorProfit: 0,
          totalPendingCompanyBalance: 0,
          totalSalesReturns: 0,
          totalPurchaseReturns: 0,
          totalPaymentsIn: 0,
          totalPaymentsOut: 0,
          totalPendingClaims: 0,
          totalApprovedClaims: 0,
          totalPaidClaims: 0
        },
        distributors: []
      }

      unassignedDistributors.forEach(dist => {
        const distFinancials = calculateDistributorFinancials(dist)
        
        // Add to unassigned totals
        unassignedData.totals = sumTotals([unassignedData.totals, distFinancials])

        unassignedData.distributors.push(distFinancials)
      })

      // Add to overall totals
      overallTotals = sumTotals([overallTotals, unassignedData.totals])

      groupedData.push(unassignedData)
    }

    res.json({
      overview: groupedData,
      overallTotals
    })

  } catch (error) {
    console.error('Error fetching financial overview:', error)
    res.status(500).json({ error: 'Failed to fetch financial overview' })
  }
})

// Get detailed financials for a single distributor
router.get('/distributor/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        invoices: {
          include: { invoiceItems: true },
          orderBy: { createdAt: 'desc' }
        },
        purchaseLedgers: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    // Calculate per-invoice profit
    const invoicesWithProfit = distributor.invoices.map(invoice => {
      let invoiceStockCost = 0
      invoice.invoiceItems.forEach(item => {
        if (item.costPrice) {
          invoiceStockCost += item.qty * getNum(item.costPrice)
        }
      })
      const invoiceProfit = getNum(invoice.grandTotal) - invoiceStockCost
      return {
        ...invoice,
        stockCost: invoiceStockCost,
        profit: invoiceProfit,
        profitStatus: invoiceProfit >= 0 ? 'PROFIT' : 'LOSS'
      }
    })

    // Calculate totals
    const totalCompanyDebits = distributor.purchaseLedgers.reduce((sum, pl) => sum + getNum(pl.totalAmount), 0)
    const totalAmountRealized = distributor.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
    let totalStockCost = 0
    distributor.invoices.forEach(inv => {
      inv.invoiceItems.forEach(item => {
        if (item.costPrice) {
          totalStockCost += item.qty * getNum(item.costPrice)
        }
      })
    })
    const totalDistributorProfit = totalAmountRealized - totalStockCost
    const pendingCompanyBalance = totalCompanyDebits - totalAmountRealized

    res.json({
      distributor: {
        id: distributor.id,
        companyName: distributor.companyName,
        ownerName: distributor.ownerName,
        email: distributor.email,
        city: distributor.city,
        isActive: distributor.isActive
      },
      financials: {
        totalCompanyDebits,
        totalAmountRealized,
        totalStockCost,
        totalDistributorProfit,
        pendingCompanyBalance
      },
      invoices: invoicesWithProfit,
      purchases: distributor.purchaseLedgers
    })

  } catch (error) {
    console.error('Error fetching distributor financials:', error)
    res.status(500).json({ error: 'Failed to fetch distributor financials' })
  }
})

// Recalculate financials for all distributors (manual refresh)
router.post('/recalculate', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const distributors = await prisma.distributor.findMany({
      include: {
        invoices: { include: { invoiceItems: true } },
        purchaseLedgers: true
      }
    })

    for (const distributor of distributors) {
      const totalCompanyDebits = distributor.purchaseLedgers.reduce((sum, pl) => sum + getNum(pl.totalAmount), 0)
      const totalAmountRealized = distributor.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
      const pendingCompanyBalance = totalCompanyDebits - totalAmountRealized

      await prisma.distributor.update({
        where: { id: distributor.id },
        data: {
          totalCompanyDebits,
          totalAmountRealized,
          pendingCompanyBalance
        }
      })
    }

    res.json({ message: 'Financials recalculated successfully', count: distributors.length })

  } catch (error) {
    console.error('Error recalculating financials:', error)
    res.status(500).json({ error: 'Failed to recalculate financials' })
  }
})

module.exports = router
