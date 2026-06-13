const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const router = express.Router()

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'salesReturnCount', 'paymentInCount', 'purchaseReturnCount', 'paymentOutCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'currentStock', 'baseSellingPrice', 'costPrice', 'gstPercentage'].includes(keyName)) {
    return obj
  }
  if (typeof obj === 'string' && !isNaN(obj) && obj.trim() !== '') {
    return parseFloat(obj)
  }
  if (typeof obj === 'object') {
    if (obj.toNumber) return obj.toNumber()
    if (Array.isArray(obj)) return obj.map(item => convertDecimals(item))
    const newObj = {}
    for (const key in obj) {
      newObj[key] = convertDecimals(obj[key], key)
    }
    return newObj
  }
  return obj
}

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

router.get('/csas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId

    const csas = await prisma.user.findMany({
      where: { role: 'CSA', adminId },
      include: { managedCsaDistributors: { include: { users: true } } },
      orderBy: { createdAt: 'desc' }
    })

    res.json(convertDecimals(csas))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSAs' })
  }
})

router.get('/csas/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query
    const adminId = req.user.userId

    const whereDateRange = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      whereDateRange.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereDateRange.lte = end
    }

    const csa = await prisma.user.findFirst({
      where: { id, role: 'CSA', adminId },
      include: { managedCsaDistributors: { include: { users: true } } }
    })

    if (!csa) {
      return res.status(404).json({ error: 'CSA not found' })
    }

    // Get all distributors managed by this CSA
    const distributors = csa.managedCsaDistributors
    const distributorMap = {}
    distributors.forEach(dist => {
      distributorMap[dist.id] = dist.companyName
    })

    // Aggregate stats for this CSA's own data
    const salesAgg = await prisma.invoice.aggregate({
      where: { csaId: id, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const salesReturnsAgg = await prisma.salesReturn.aggregate({
      where: { csaId: id, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const paymentsInAgg = await prisma.paymentIn.aggregate({
      where: { csaId: id, date: whereDateRange },
      _sum: { amount: true }
    })
    const purchaseReturnsAgg = await prisma.purchaseReturn.aggregate({
      where: { csaId: id, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const paymentsOutAgg = await prisma.paymentOut.aggregate({
      where: { csaId: id, date: whereDateRange },
      _sum: { amount: true }
    })

    const totalSales = getNum(salesAgg._sum.grandTotal)
    const totalSalesReturns = getNum(salesReturnsAgg._sum.grandTotal)
    const totalPaymentsReceived = getNum(paymentsInAgg._sum.amount)
    const totalPurchaseReturns = getNum(purchaseReturnsAgg._sum.grandTotal)
    const totalPaymentsOut = getNum(paymentsOutAgg._sum.amount)

    const totalInvoices = await prisma.invoice.count({
      where: { csaId: id, date: whereDateRange }
    })
    const totalParties = await prisma.party.count({
      where: { OR: distributors.map(d => ({ distributorId: d.id })) }
    })
    const totalProducts = await prisma.product.count({
      where: { OR: distributors.map(d => ({ distributorId: d.id })) }
    })
    const totalClaims = await prisma.claim.count({
      where: { csaId: id, createdAt: whereDateRange }
    })
    const totalSalesReturnsCount = await prisma.salesReturn.count({
      where: { csaId: id, date: whereDateRange }
    })
    const totalPaymentInCount = await prisma.paymentIn.count({
      where: { csaId: id, date: whereDateRange }
    })
    const totalPurchaseReturnCount = await prisma.purchaseReturn.count({
      where: { csaId: id, date: whereDateRange }
    })
    const totalPaymentOutCount = await prisma.paymentOut.count({
      where: { csaId: id, date: whereDateRange }
    })
    const pendingClaimsCount = await prisma.claim.count({
      where: { csaId: id, status: 'PENDING', createdAt: whereDateRange }
    })

    // Get detailed data for this CSA
    const invoices = await prisma.invoice.findMany({
      where: { csaId: id, date: whereDateRange },
      include: { party: true, invoiceItems: true },
      orderBy: { createdAt: 'desc' }
    })
    const allInvoices = invoices.map(inv => ({ ...inv, distributorName: distributorMap[inv.distributorId] }))

    const salesReturns = await prisma.salesReturn.findMany({
      where: { csaId: id, date: whereDateRange },
      include: { party: true },
      orderBy: { createdAt: 'desc' }
    })
    const allSalesReturns = salesReturns.map(sr => ({ ...sr, distributorName: distributorMap[sr.distributorId] }))

    const paymentsIn = await prisma.paymentIn.findMany({
      where: { csaId: id, date: whereDateRange },
      include: { party: true },
      orderBy: { createdAt: 'desc' }
    })
    const allPaymentsIn = paymentsIn.map(pi => ({ ...pi, distributorName: distributorMap[pi.distributorId] }))

    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: { csaId: id, date: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })
    const allPurchaseReturns = purchaseReturns.map(pr => ({ ...pr, distributorName: distributorMap[pr.distributorId] }))

    const paymentsOut = await prisma.paymentOut.findMany({
      where: { csaId: id, date: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })
    const allPaymentsOut = paymentsOut.map(po => ({ ...po, distributorName: distributorMap[po.distributorId] }))

    const parties = await prisma.party.findMany({
      where: { OR: distributors.map(d => ({ distributorId: d.id })) },
      include: {
        invoices: {
          where: { csaId: id, date: whereDateRange }
        }
      }
    })
    const allParties = parties.map(p => ({ ...p, distributorName: distributorMap[p.distributorId] }))

    const products = await prisma.product.findMany({
      where: { OR: distributors.map(d => ({ distributorId: d.id })) },
      include: {
        invoiceItems: {
          where: { invoice: { csaId: id, date: whereDateRange } },
          include: { invoice: true }
        }
      }
    })
    const allProducts = products.map(p => ({ ...p, distributorName: distributorMap[p.distributorId] }))

    const claims = await prisma.claim.findMany({
      where: { csaId: id, createdAt: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })
    const allClaims = claims.map(c => ({ ...c, distributorName: distributorMap[c.distributorId] }))

    const totalRevenue = totalSales - totalSalesReturns

    res.json(convertDecimals({
      ...csa,
      distributors,
      totalSales,
      totalSalesReturns,
      totalRevenue,
      totalPaymentsReceived,
      totalPurchaseReturns,
      totalPaymentsOut,
      totalInvoices,
      totalParties,
      totalProducts,
      totalClaims,
      totalSalesReturnsCount,
      totalPaymentInCount,
      totalPurchaseReturnCount,
      totalPaymentOutCount,
      pendingClaimsCount,
      invoices: allInvoices,
      salesReturns: allSalesReturns,
      paymentsIn: allPaymentsIn,
      purchaseReturns: allPurchaseReturns,
      paymentsOut: allPaymentsOut,
      parties: allParties,
      products: allProducts,
      claims: allClaims
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSA details' })
  }
})

router.get('/distributors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const adminId = req.user.userId // Fixed: using userId instead of id

    const whereDateRange = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      whereDateRange.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereDateRange.lte = end
    }

    const csas = await prisma.user.findMany({
      where: { role: 'CSA', adminId },
      include: { 
        managedCsaDistributors: { 
          include: { users: true, csa: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const unassignedDistributors = await prisma.distributor.findMany({
      where: { adminId, csaId: null },
      include: { users: true },
      orderBy: { createdAt: 'desc' }
    })

    const allDistributors = [
      ...csas.flatMap(csa => csa.managedCsaDistributors.map(d => ({ ...d, csa }))),
      ...unassignedDistributors.map(d => ({ ...d, csa: null }))
    ]

    const distributorsWithStats = await Promise.all(allDistributors.map(async (dist) => {
      const totalSalesAgg = await prisma.invoice.aggregate({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalPaymentsInAgg = await prisma.paymentIn.aggregate({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange },
        _sum: { amount: true }
      })
      const totalPurchaseReturnsAgg = await prisma.purchaseReturn.aggregate({
        where: { distributorId: dist.id, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalPaymentsOutAgg = await prisma.paymentOut.aggregate({
        where: { distributorId: dist.id, date: whereDateRange },
        _sum: { amount: true }
      })
      
      const totalSales = totalSalesAgg._sum.grandTotal || 0
      const totalSalesReturns = totalSalesReturnsAgg._sum.grandTotal || 0
      const totalRevenue = totalSales - totalSalesReturns
      const totalPaymentsReceived = totalPaymentsInAgg._sum.amount || 0
      const totalPurchaseReturns = totalPurchaseReturnsAgg._sum.grandTotal || 0
      const totalPaymentsOut = totalPaymentsOutAgg._sum.amount || 0
      
      const invoiceCount = await prisma.invoice.count({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange }
      })
      const partyCount = await prisma.party.count({
        where: { distributorId: dist.id }
      })
      const productCount = await prisma.product.count({
        where: { distributorId: dist.id }
      })
      const claimCount = await prisma.claim.count({
        where: { distributorId: dist.id, createdAt: whereDateRange }
      })
      const salesReturnCount = await prisma.salesReturn.count({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange }
      })
      const paymentInCount = await prisma.paymentIn.count({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange }
      })
      const purchaseReturnCount = await prisma.purchaseReturn.count({
        where: { distributorId: dist.id, date: whereDateRange }
      })
      const paymentOutCount = await prisma.paymentOut.count({
        where: { distributorId: dist.id, date: whereDateRange }
      })
      return {
        distributorId: dist.id,
        companyName: dist.companyName,
        ownerName: dist.ownerName,
        email: dist.email,
        phone: dist.phone,
        city: dist.city,
        gstIn: dist.gstIn,
        isActive: dist.isActive,
        csaId: dist.csaId,
        csa: dist.csa,
        totalSales,
        totalSalesReturns,
        totalRevenue,
        totalPaymentsReceived,
        totalPurchaseReturns,
        totalPaymentsOut,
        totalCompanyDebits: dist.totalCompanyDebits,
        totalAmountRealized: dist.totalAmountRealized,
        pendingCompanyBalance: dist.pendingCompanyBalance,
        invoiceCount,
        partyCount,
        productCount,
        claimCount,
        salesReturnCount,
        paymentInCount,
        purchaseReturnCount,
        paymentOutCount,
        createdAt: dist.createdAt
      }
    }))

    res.json(convertDecimals(distributorsWithStats))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch distributors' })
  }
})

router.get('/distributors/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query
    const adminId = req.user.userId // Fixed: using userId instead of id

    const whereDateRange = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      whereDateRange.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereDateRange.lte = end
    }

    const distributor = await prisma.distributor.findUnique({
      where: { id, adminId },
      include: { users: true }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    const totalSalesAgg = await prisma.invoice.aggregate({
      where: { distributorId: id, csaId: null, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
      where: { distributorId: id, csaId: null, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const totalPaymentsInAgg = await prisma.paymentIn.aggregate({
      where: { distributorId: id, csaId: null, date: whereDateRange },
      _sum: { amount: true }
    })
    const totalPurchaseReturnsAgg = await prisma.purchaseReturn.aggregate({
      where: { distributorId: id, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const totalPaymentsOutAgg = await prisma.paymentOut.aggregate({
      where: { distributorId: id, date: whereDateRange },
      _sum: { amount: true }
    })
    const pendingClaimsCount = await prisma.claim.count({
      where: { distributorId: id, status: 'PENDING', createdAt: whereDateRange }
    })
    
    const totalSales = totalSalesAgg._sum.grandTotal || 0
    const totalSalesReturns = totalSalesReturnsAgg._sum.grandTotal || 0
    const totalRevenue = totalSales - totalSalesReturns
    const totalPaymentsReceived = totalPaymentsInAgg._sum.amount || 0
    const totalPurchaseReturns = totalPurchaseReturnsAgg._sum.grandTotal || 0
    const totalPaymentsOut = totalPaymentsOutAgg._sum.amount || 0
    
    const invoiceCount = await prisma.invoice.count({
      where: { distributorId: id, csaId: null, date: whereDateRange }
    })
    const partyCount = await prisma.party.count({
      where: { distributorId: id }
    })
    const productCount = await prisma.product.count({
      where: { distributorId: id }
    })
    const claimCount = await prisma.claim.count({
      where: { distributorId: id, createdAt: whereDateRange }
    })
    const salesReturnCount = await prisma.salesReturn.count({
      where: { distributorId: id, csaId: null, date: whereDateRange }
    })
    const paymentInCount = await prisma.paymentIn.count({
      where: { distributorId: id, csaId: null, date: whereDateRange }
    })
    const purchaseReturnCount = await prisma.purchaseReturn.count({
      where: { distributorId: id, date: whereDateRange }
    })
    const paymentOutCount = await prisma.paymentOut.count({
      where: { distributorId: id, date: whereDateRange }
    })

    const parties = await prisma.party.findMany({
      where: { distributorId: id },
      include: {
        invoices: {
          where: { distributorId: id, csaId: null, date: whereDateRange }
        }
      }
    })

    const partySales = parties.map(party => {
      const partyTotal = party.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
      return {
        partyId: party.id,
        partyName: party.name,
        gstin: party.gstin,
        phone: party.phone,
        totalBilling: partyTotal,
        invoiceCount: party.invoices.length
      }
    }).sort((a, b) => b.totalBilling - a.totalBilling)

    const products = await prisma.product.findMany({
      where: { distributorId: id },
      include: {
        invoiceItems: {
          where: { invoice: { distributorId: id, csaId: null, date: whereDateRange } },
          include: { invoice: true }
        }
      }
    })

    const invoices = await prisma.invoice.findMany({
      where: { distributorId: id, csaId: null, date: whereDateRange },
      include: { party: true, invoiceItems: true },
      orderBy: { createdAt: 'desc' }
    })

    const claims = await prisma.claim.findMany({
      where: { distributorId: id, createdAt: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })

    const salesReturns = await prisma.salesReturn.findMany({
      where: { distributorId: id, csaId: null, date: whereDateRange },
      include: { party: true },
      orderBy: { createdAt: 'desc' }
    })

    const paymentsIn = await prisma.paymentIn.findMany({
      where: { distributorId: id, csaId: null, date: whereDateRange },
      include: { party: true },
      orderBy: { createdAt: 'desc' }
    })

    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: { distributorId: id, date: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })

    const paymentsOut = await prisma.paymentOut.findMany({
      where: { distributorId: id, date: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })

    res.json(convertDecimals({
      ...distributor,
      totalSales,
      totalSalesReturns,
      totalRevenue,
      totalPaymentsReceived,
      totalPurchaseReturns,
      totalPaymentsOut,
      pendingClaimsCount,
      totalCompanyDebits: distributor.totalCompanyDebits,
      totalAmountRealized: distributor.totalAmountRealized,
      pendingCompanyBalance: distributor.pendingCompanyBalance,
      invoiceCount,
      partyCount,
      productCount,
      claimCount,
      salesReturnCount,
      paymentInCount,
      purchaseReturnCount,
      paymentOutCount,
      parties,
      partySales,
      products,
      invoices,
      claims,
      salesReturns,
      paymentsIn,
      purchaseReturns,
      paymentsOut
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch distributor details' })
  }
})

router.get('/reports/distributor-ranking', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const adminId = req.user.userId

    const whereDateRange = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      whereDateRange.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereDateRange.lte = end
    }

    const distributors = await prisma.distributor.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' }
    })

    const distributorsWithStats = await Promise.all(distributors.map(async (dist) => {
      const totalSalesAgg = await prisma.invoice.aggregate({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
        where: { distributorId: dist.id, csaId: null, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalSales = totalSalesAgg._sum.grandTotal || 0
      const totalSalesReturns = totalSalesReturnsAgg._sum.grandTotal || 0
      const totalRevenue = totalSales - totalSalesReturns

      return {
        distributorId: dist.id,
        companyName: dist.companyName,
        ownerName: dist.ownerName,
        email: dist.email,
        phone: dist.phone,
        city: dist.city,
        isActive: dist.isActive,
        totalSales,
        totalSalesReturns,
        totalRevenue
      }
    }))

    const sortedDistributors = distributorsWithStats.sort((a, b) => b.totalRevenue - a.totalRevenue)
    res.json(convertDecimals(sortedDistributors))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch distributor ranking' })
  }
})

// Endpoint to get CSA performance for admin
router.get('/reports/csa-performance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const adminId = req.user.userId

    const whereDateRange = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      whereDateRange.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereDateRange.lte = end
    }

    const csas = await prisma.user.findMany({
      where: { role: 'CSA', adminId },
      include: {
        managedCsaDistributors: true
      }
    })

    const csaPerformance = await Promise.all(csas.map(async csa => {
      let totalRevenue = 0
      let totalSales = 0
      let totalSalesReturns = 0
      let totalPaymentsReceived = 0
      let distributorCount = 0
      let activeDistributorCount = 0
      let totalInvoices = 0

      for (const dist of csa.managedCsaDistributors) {
        distributorCount++
        if (dist.isActive) activeDistributorCount++

        const salesAgg = await prisma.invoice.aggregate({
          where: { distributorId: dist.id, csaId: null, date: whereDateRange },
          _sum: { grandTotal: true }
        })
        const salesReturnsAgg = await prisma.salesReturn.aggregate({
          where: { distributorId: dist.id, csaId: null, date: whereDateRange },
          _sum: { grandTotal: true }
        })
        const paymentsAgg = await prisma.paymentIn.aggregate({
          where: { distributorId: dist.id, csaId: null, date: whereDateRange },
          _sum: { amount: true }
        })
        const invCount = await prisma.invoice.count({
          where: { distributorId: dist.id, csaId: null, date: whereDateRange }
        })

        totalSales += getNum(salesAgg._sum.grandTotal) || 0
        totalSalesReturns += getNum(salesReturnsAgg._sum.grandTotal) || 0
        totalPaymentsReceived += getNum(paymentsAgg._sum.amount) || 0
        totalInvoices += invCount
      }

      totalRevenue = totalSales - totalSalesReturns

      return {
        csaId: csa.id,
        name: csa.name,
        email: csa.email,
        distributorCount,
        activeDistributorCount,
        totalSales,
        totalSalesReturns,
        totalRevenue,
        totalPaymentsReceived,
        totalInvoices
      }
    }))

    csaPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)

    res.json(convertDecimals(csaPerformance))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSA performance' })
  }
})

module.exports = router
