const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const prisma = require('../lib/prisma')
const { authenticateToken, requireCSA } = require('../middleware/auth')
const router = express.Router()

const upload = multer({ dest: 'uploads/' })

const getDateRange = (query) => {
  const { startDate, endDate } = query || {}
  const range = {}
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    range.gte = start
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    range.lte = end
  }
  return range
}

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'salesReturnCount', 'paymentInCount', 'purchaseReturnCount', 'paymentOutCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'supplierName', 'paymentMode', 'referenceNo', 'notes', 'reason', 'distributorName', 'createdByRole', 'createdByUserId'].includes(keyName)) {
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

router.get('/claims/extra-margin', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const distributors = await prisma.distributor.findMany({
      where: { csaId },
      select: { id: true }
    })
    const distributorIds = distributors.map(d => d.id)

    if (!distributorIds.length) {
      return res.json({ claims: [], totalClaimAmount: 0, count: 0 })
    }

    const dateRange = getDateRange(req.query)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        extraMarginPercentage: { gt: 0 },
        invoice: {
          OR: [
            { csaId },
            { createdById: csaId }
          ],
          distributorId: { in: distributorIds },
          date: dateRange
        }
      },
      include: {
        product: true,
        invoice: {
          include: {
            distributor: true
          }
        }
      }
    })

    const claims = invoiceItems.map(item => {
      const baseAmount = item.qty * item.rate
      const marginAmount = (baseAmount * item.extraMarginPercentage) / 100
      return {
        id: item.id,
        productName: item.product?.name,
        distributorName: item.invoice?.distributor?.companyName,
        invoiceNo: item.invoice?.invoiceNo,
        invoiceDate: item.invoice?.date,
        qty: item.qty,
        rate: item.rate,
        extraMarginPercentage: item.extraMarginPercentage,
        claimAmount: marginAmount
      }
    })

    const totalClaimAmount = claims.reduce((sum, c) => sum + c.claimAmount, 0)

    res.json(convertDecimals({
      claims,
      totalClaimAmount,
      count: claims.length
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSA extra margin claims' })
  }
})

router.get('/claims', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const dateRange = getDateRange(req.query)

    const claims = await prisma.claim.findMany({
      where: {
        distributor: { csaId },
        createdByRole: 'CSA',
        createdAt: dateRange
      },
      include: { distributor: true },
      orderBy: { createdAt: 'desc' }
    })

    res.json(convertDecimals(claims))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSA claims' })
  }
})

router.post('/claims', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { brandName, claimDetails, amount, status, distributorId } = req.body
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId: req.user.userId }
    })

    if (!distributor) {
      return res.status(403).json({ error: 'Distributor not found for this CSA' })
    }

    const claim = await prisma.claim.create({
      data: {
        brandName,
        claimDetails,
        amount: parseFloat(amount),
        status: status || 'PENDING',
        distributorId: distributor.id,
        csaId: req.user.userId,
        createdByRole: 'CSA',
        createdByUserId: req.user.userId
      }
    })

    res.status(201).json(convertDecimals(claim))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create CSA claim' })
  }
})

router.put('/claims/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const { brandName, claimDetails, amount, status, distributorId } = req.body

    const existingClaim = await prisma.claim.findUnique({ where: { id } })
    if (!existingClaim) {
      return res.status(404).json({ error: 'Claim not found' })
    }

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId || existingClaim.distributorId, csaId: req.user.userId }
    })

    if (!distributor) {
      return res.status(403).json({ error: 'Distributor not found for this CSA' })
    }

    const claim = await prisma.claim.update({
      where: { id },
      data: {
        brandName,
        claimDetails,
        amount: parseFloat(amount),
        status,
        distributorId: distributor.id,
        createdByRole: existingClaim.createdByRole || 'CSA',
        createdByUserId: existingClaim.createdByUserId || req.user.userId
      }
    })

    res.json(convertDecimals(claim))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update CSA claim' })
  }
})

router.delete('/claims/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const existingClaim = await prisma.claim.findUnique({ where: { id } })
    if (!existingClaim) {
      return res.status(404).json({ error: 'Claim not found' })
    }

    const distributor = await prisma.distributor.findFirst({
      where: { id: existingClaim.distributorId, csaId: req.user.userId }
    })

    if (!distributor) {
      return res.status(403).json({ error: 'Distributor access denied' })
    }

    await prisma.claim.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete CSA claim' })
  }
})

router.get('/claims/gst-summary', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const distributors = await prisma.distributor.findMany({
      where: { csaId },
      select: { id: true }
    })
    const distributorIds = distributors.map(d => d.id)

    if (!distributorIds.length) {
      return res.json([])
    }

    const dateRange = getDateRange(req.query)
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { csaId },
          { createdById: csaId }
        ],
        distributorId: { in: distributorIds },
        date: dateRange
      },
      include: { invoiceItems: true },
      orderBy: { date: 'asc' }
    })

    const monthlyData = {}
    invoices.forEach(invoice => {
      const date = new Date(invoice.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: monthName,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0
        }
      }

      const getNum = (val) => {
        if (typeof val === 'number') return val
        if (val?.toNumber) return val.toNumber()
        return parseFloat(val)
      }

      monthlyData[key].taxableValue += getNum(invoice.taxableValue)
      monthlyData[key].cgst += getNum(invoice.cgst)
      monthlyData[key].sgst += getNum(invoice.sgst)
      monthlyData[key].igst += getNum(invoice.igst)
      monthlyData[key].total += getNum(invoice.grandTotal)
    })

    const gstReport = Object.values(monthlyData).sort((a, b) => {
      const [yearA, monthA] = a.month.split(' ').reverse()
      const [yearB, monthB] = b.month.split(' ').reverse()
      return parseInt(yearA) - parseInt(yearB) || 
        new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`)
    })

    res.json(convertDecimals(gstReport))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSA GST summary' })
  }
})

router.get('/distributors', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId

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
      where: { csaId },
      include: { users: true },
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
        id: dist.id,
        distributorId: dist.id,
        companyName: dist.companyName,
        ownerName: dist.ownerName,
        email: dist.email,
        phone: dist.phone,
        city: dist.city,
        gstIn: dist.gstIn,
        isActive: dist.isActive,
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

router.get('/distributors/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query
    const csaId = req.user.userId

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

    const distributor = await prisma.distributor.findFirst({
      where: { id, csaId },
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

router.get('/reports/distributor-ranking', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId

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
      where: { csaId },
      orderBy: { createdAt: 'desc' }
    })

    const distributorsWithStats = await Promise.all(distributors.map(async (dist) => {
      const totalSalesAgg = await prisma.invoice.aggregate({
        where: { distributorId: dist.id, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
        where: { distributorId: dist.id, date: whereDateRange },
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

// CSA Invoice Endpoints
router.get('/invoices/my', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const invoices = await prisma.invoice.findMany({
      where: { createdById: csaId },
      include: { 
        party: true, 
        invoiceItems: { include: { product: true } },
        distributor: { select: { id: true, companyName: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(convertDecimals(invoices))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

router.get('/distributors/:distributorId/invoices', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    const invoices = await prisma.invoice.findMany({
      where: { distributorId },
      include: { party: true, invoiceItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })

    res.json(invoices)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

router.get('/distributors/:distributorId/invoices/:invoiceId', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId, invoiceId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { party: true, invoiceItems: { include: { product: true } } }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (invoice.distributorId !== distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(invoice)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoice' })
  }
})

router.post('/distributors/:distributorId/invoices/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId
    const { partyId, items, isInterState } = req.body

    console.log('Creating invoice:', { distributorId, csaId, partyId, items: items.length, isInterState })

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    // If partyId is provided, verify it exists and belongs to the distributor
    if (partyId) {
      const party = await prisma.party.findUnique({
        where: { id: partyId }
      })

      if (!party || party.distributorId !== distributorId) {
        return res.status(403).json({ error: 'Invalid party' })
      }
    }

    const lastInvoice = await prisma.invoice.findFirst({
      where: { distributorId },
      orderBy: { invoiceNo: 'desc' }
    })
    const nextInvoiceNo = lastInvoice 
      ? `INV-${parseInt(lastInvoice.invoiceNo.split('-')[1]) + 1}`
      : 'INV-1001'

    const result = await prisma.$transaction(async (tx) => {
      let totalTaxable = 0
      let totalCGST = 0
      let totalSGST = 0
      let totalIGST = 0
      let productsData = []
      let invoiceStockCost = 0

      for (const item of items) {
        // Get the product directly
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`)
        }
        

        
        if (product.currentStock < item.qty) {
          throw new Error(`Insufficient stock for product: ${product.name}`)
        }
        
        const itemStockCost = item.qty * getNum(product.costPrice)
        invoiceStockCost += itemStockCost
        
        productsData.push({ ...item, product, itemStockCost })
        
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: item.qty } }
        })
      }

      const invoiceItemsData = productsData.map(({ product, qty, rate, gstPercentage, extraMarginPercentage }) => ({
        productId: product.id,
        qty,
        costPrice: product.costPrice,
        rate,
        gstPercentage,
        extraMarginPercentage: extraMarginPercentage || 0,
        total: (qty * rate) + ((qty * rate * gstPercentage) / 100),
        distributorId
      }))

      for (const item of items) {
        const taxable = item.qty * item.rate
        totalTaxable += taxable
        const gstAmount = (taxable * item.gstPercentage) / 100
        if (isInterState) {
          totalIGST += gstAmount
        } else {
          totalCGST += gstAmount / 2
          totalSGST += gstAmount / 2
        }
      }

      const grandTotal = totalTaxable + totalCGST + totalSGST + totalIGST

      const invoiceProfit = grandTotal - invoiceStockCost
      const profitStatus = invoiceProfit >= 0 ? 'PROFIT' : 'LOSS'

      console.log(`📊 Invoice ${nextInvoiceNo} created by CSA for distributor ${distributor.companyName}:`)
      console.log(`  - Stock Cost: ₹${invoiceStockCost.toFixed(2)}`)
      console.log(`  - Revenue: ₹${grandTotal.toFixed(2)}`)
      console.log(`  - Profit: ₹${invoiceProfit.toFixed(2)} (${profitStatus})`)

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: nextInvoiceNo,
          partyId,
          distributorId,
          csaId,
          createdById: csaId,
          date: new Date(),
          taxableValue: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          igst: totalIGST,
          grandTotal,
          invoiceItems: {
            create: invoiceItemsData
          }
        },
        include: { party: true, invoiceItems: { include: { product: true } } }
      })

      await tx.distributor.update({
        where: { id: distributorId },
        data: {
          totalAmountRealized: { increment: grandTotal },
          pendingCompanyBalance: { decrement: grandTotal }
        }
      })

      return {
        ...invoice,
        invoiceStockCost,
        invoiceProfit,
        profitStatus
      }
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('Create invoice error:', error)
    res.status(500).json({ error: error.message || 'Failed to create invoice' })
  }
})

// CSA Invoice Detail Endpoint
router.get('/invoices/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const csaId = req.user.userId
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { distributor: true, invoiceItems: { include: { product: true } } }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (invoice.createdById !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(convertDecimals(invoice))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoice' })
  }
})

// CSA Update Invoice Endpoint
router.put('/invoices/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const { items, isInterState } = req.body
    const csaId = req.user.userId

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { invoiceItems: true }
    })

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (existingInvoice.createdById !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if invoice is older than 3 days
    const invoiceDate = new Date(existingInvoice.createdAt)
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    if (invoiceDate < threeDaysAgo) {
      return res.status(400).json({ error: 'Invoice cannot be edited after 3 days' })
    }

    const result = await prisma.$transaction(async (tx) => {
      // First, restore old stock
      for (const oldItem of existingInvoice.invoiceItems) {
        await tx.product.update({
          where: { id: oldItem.productId },
          data: { currentStock: { increment: oldItem.qty } }
        })
      }

      // Subtract old grand total from distributor financials
      await tx.distributor.update({
        where: { id: existingInvoice.distributorId },
        data: {
          totalAmountRealized: { decrement: getNum(existingInvoice.grandTotal) },
          pendingCompanyBalance: { increment: getNum(existingInvoice.grandTotal) }
        }
      })

      // Delete old invoice items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })

      // Now process new items
      let totalTaxable = 0
      let totalCGST = 0
      let totalSGST = 0
      let totalIGST = 0
      let productsData = []
      let invoiceStockCost = 0

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`)
        }
        if (product.currentStock < item.qty) {
          throw new Error(`Insufficient stock for product: ${product.name}`)
        }

        const itemStockCost = item.qty * getNum(product.costPrice)
        invoiceStockCost += itemStockCost

        productsData.push({ ...item, product, itemStockCost })

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.qty } }
        })
      }

      const invoiceItemsData = productsData.map(({ product, qty, rate, gstPercentage, extraMarginPercentage }) => ({
        productId: product.id,
        qty,
        costPrice: product.costPrice,
        rate,
        gstPercentage,
        extraMarginPercentage: extraMarginPercentage || 0,
        total: (qty * rate) + ((qty * rate * gstPercentage) / 100),
        distributorId: existingInvoice.distributorId,
        csaId
      }))

      for (const item of items) {
        const taxable = item.qty * item.rate
        totalTaxable += taxable
        const gstAmount = (taxable * item.gstPercentage) / 100
        if (isInterState) {
          totalIGST += gstAmount
        } else {
          totalCGST += gstAmount / 2
          totalSGST += gstAmount / 2
        }
      }

      const grandTotal = totalTaxable + totalCGST + totalSGST + totalIGST

      // Update the invoice
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          taxableValue: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          igst: totalIGST,
          grandTotal,
          invoiceItems: {
            create: invoiceItemsData
          }
        },
        include: { party: true, invoiceItems: { include: { product: true } } }
      })

      // Update distributor financials with new grand total
      await tx.distributor.update({
        where: { id: existingInvoice.distributorId },
        data: {
          totalAmountRealized: { increment: grandTotal },
          pendingCompanyBalance: { decrement: grandTotal }
        }
      })

      return invoice
    })

    res.json(convertDecimals(result))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Failed to edit invoice' })
  }
})

// CSA Delete Invoice Endpoint
router.delete('/invoices/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const csaId = req.user.userId

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { invoiceItems: true }
    })

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (existingInvoice.createdById !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of existingInvoice.invoiceItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.qty } }
        })
      }

      // Update distributor financials
      await tx.distributor.update({
        where: { id: existingInvoice.distributorId },
        data: {
          totalAmountRealized: { decrement: getNum(existingInvoice.grandTotal) },
          pendingCompanyBalance: { increment: getNum(existingInvoice.grandTotal) }
        }
      })

      // Delete invoice items first
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })

      // Now delete the invoice
      await tx.invoice.delete({
        where: { id }
      })
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete invoice' })
  }
})

// CSA Sales Returns Endpoints
router.get('/distributors/:distributorId/sales-returns', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params;
    const csaId = req.user.userId;

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    });

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' });
    }

    const salesReturns = await prisma.salesReturn.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(convertDecimals(salesReturns));
  } catch (error) {
    console.error('Get sales returns error:', error);
    res.status(500).json({ error: 'Failed to fetch sales returns' });
  }
});

router.post('/distributors/:distributorId/sales-returns/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params;
    const csaId = req.user.userId;
    const { items, reason } = req.body;

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    });

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const lastReturn = await prisma.salesReturn.findFirst({
      where: { csaId },
      orderBy: { returnNo: 'desc' }
    });
    const nextReturnNo = lastReturn 
      ? `SR-${parseInt(lastReturn.returnNo.split('-')[1]) + 1}`
      : 'SR-1001';

    const result = await prisma.$transaction(async (tx) => {
      let totalTaxable = 0;
      let totalCGST = 0;
      let totalSGST = 0;

      for (const item of items) {
        // Check if product exists and belongs to the distributor
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.distributorId !== distributorId) {
          throw new Error(`Product ${item.productId} does not belong to distributor ${distributorId}`);
        }

        // Update product stock
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { increment: item.qty } }
        });

        const taxable = item.qty * item.rate;
        totalTaxable += taxable;
        const gstAmount = (taxable * item.gstPercentage) / 100;
        totalCGST += gstAmount / 2;
        totalSGST += gstAmount / 2;
      }

      const grandTotal = totalTaxable + totalCGST + totalSGST;

      const salesReturnItemsData = items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        costPrice: item.costPrice,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        total: (item.qty * item.rate) + ((item.qty * item.rate * item.gstPercentage) / 100),
        distributorId,
        csaId
      }));

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo: nextReturnNo,
          csaId,
          distributorId,
          date: new Date(),
          reason: reason || null,
          taxableValue: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          grandTotal,
          salesReturnItems: {
            create: salesReturnItemsData
          }
        },
        include: { salesReturnItems: { include: { product: true } }, distributor: true }
      });

      return salesReturn;
    });

    res.status(201).json(convertDecimals(result));
  } catch (error) {
    console.error('Create sales return error:', error);
    res.status(500).json({ error: error.message || 'Failed to create sales return' });
  }
});

// CSA Payments In Endpoints
router.get('/distributors/:distributorId/payments-in', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params;
    const csaId = req.user.userId;

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    });

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' });
    }

    const paymentsIn = await prisma.paymentIn.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(convertDecimals(paymentsIn));
  } catch (error) {
    console.error('Get payments in error:', error);
    res.status(500).json({ error: 'Failed to fetch payments in' });
  }
});

router.post('/distributors/:distributorId/payments-in/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params;
    const csaId = req.user.userId;
    const { amount, paymentMode, referenceNo, notes } = req.body;

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    });

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' });
    }

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const lastPayment = await prisma.paymentIn.findFirst({
      where: { distributorId },
      orderBy: { paymentNo: 'desc' }
    });
    const nextPaymentNo = lastPayment 
      ? `PYT-${parseInt(lastPayment.paymentNo.split('-')[1]) + 1}`
      : 'PYT-1001';

    const paymentIn = await prisma.paymentIn.create({
      data: {
        paymentNo: nextPaymentNo,
        distributorId,
        date: new Date(),
        amount: parseFloat(amount),
        paymentMode,
        referenceNo: referenceNo || null,
        notes: notes || null
      }
    });

    res.status(201).json(convertDecimals(paymentIn));
  } catch (error) {
    console.error('Create payment in error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment in' });
  }
});

// CSA Purchase Endpoints
router.get('/distributors/:distributorId/purchase', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    const purchases = await prisma.purchaseLedger.findMany({
      where: { distributorId },
      include: { purchaseItems: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(purchases))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

router.get('/distributors/:distributorId/purchase/suppliers', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    // First check the supplier table
    const suppliers = await prisma.supplier.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })

    if (suppliers.length > 0) {
      return res.json(convertDecimals(suppliers))
    }

    // Fall back to old behavior
    const [purchases, purchaseReturns, paymentsOut] = await Promise.all([
      prisma.purchaseLedger.findMany({
        where: { distributorId },
        select: { supplierName: true },
        distinct: ['supplierName']
      }),
      prisma.purchaseReturn.findMany({
        where: { distributorId },
        select: { supplierName: true },
        distinct: ['supplierName']
      }),
      prisma.paymentOut.findMany({
        where: { distributorId },
        select: { supplierName: true },
        distinct: ['supplierName']
      })
    ])
    
    const allSupplierNames = [
      ...purchases.map(p => p.supplierName),
      ...purchaseReturns.map(p => p.supplierName),
      ...paymentsOut.map(p => p.supplierName)
    ]
    
    const uniqueSupplierNames = [...new Set(allSupplierNames)].filter(Boolean)
    res.json(uniqueSupplierNames.map(name => ({ id: null, name })))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

router.post('/distributors/:distributorId/purchase/upload', authenticateToken, requireCSA, upload.single('file'), async (req, res) => {
  try {
    console.log('=== CSA Purchase upload request received')
    console.log('req.file:', req.file)
    console.log('req.body:', req.body)
    
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const supplierName = req.body.supplierName || 'Supplier'
    const supplierId = req.body.supplierId || null
    
    let items = []
    let jsonDataWithHeaders = []
    const fs = require('fs')
    
    // Check file type - extension, mimetype, AND file signature "%PDF-"
    const dataBuffer = fs.readFileSync(req.file.path)
    const isPdfFromExtension = req.file.originalname.toLowerCase().endsWith('.pdf')
    const isPdfFromMimetype = req.file.mimetype && req.file.mimetype.toLowerCase().includes('pdf')
    const isPdfFromSignature = dataBuffer.slice(0, 4).equals(Buffer.from('%PDF'))
    const isPdf = isPdfFromExtension || isPdfFromMimetype || isPdfFromSignature
    
    console.log('Is PDF check:', { 
      isPdfFromExtension, 
      isPdfFromMimetype, 
      isPdfFromSignature, 
      isPdf,
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype,
      first4Bytes: dataBuffer.slice(0, 4).toString()
    })
    
    if (isPdf) {
      const pdfParse = require('pdf-parse')
      
      try {
        const data = await pdfParse(dataBuffer)
        console.log('=== FULL PDF TEXT ===')
        console.log(data.text)
        
        const lines = data.text.split(/\r?\n/).filter(line => line.trim())
        console.log('=== PDF LINES ===')
        console.log(lines)
        
        // First, let's find the header row
        let headerRowIndex = -1
        const headerPatterns = [
          ['no', 'items', 'hsn', 'qty'],
          ['item', 'product', 'hsn', 'quantity'],
          ['sl', 'description', 'hsn', 'qty'],
          ['serial', 'product', 'hsn', 'rate'],
          ['no', 'items', 'hsn no', 'qty'],
          ['no', 'items', 'hsn no.', 'qty.'],
          ['no', 'items', 'hsn', 'mrp', 'rate']
        ]
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase()
          for (const pattern of headerPatterns) {
            const matches = pattern.filter(keyword => line.includes(keyword)).length
            if (matches >= 3) {
              headerRowIndex = i
              break
            }
          }
          if (headerRowIndex !== -1) break
        }
        
        if (headerRowIndex !== -1) {
          console.log('Found header row at index', headerRowIndex, lines[headerRowIndex])
          
          let i = headerRowIndex + 1
          while (i < lines.length) {
            const line = lines[i].trim()
            console.log('Processing line:', line, 'index:', i)
            
            if (line.toLowerCase().includes('total') || 
                line.toLowerCase().includes('subtotal') || 
                line.toLowerCase().includes('grand') ||
                line.toLowerCase().includes('terms') ||
                line.toLowerCase().includes('dispute') ||
                line.toLowerCase().includes('jurisdiction') ||
                line.toLowerCase().includes('rupee') ||
                line.toLowerCase().includes('lakh') ||
                line.toLowerCase().includes('thousand') ||
                line.toLowerCase().includes('original for recipient') ||
                line.toLowerCase().includes('taxable') ||
                line.toLowerCase().includes('received amount')) {
              i++
              break // Stop at total/subtotal
            }
            
            if (!/\d/.test(line) || line.length < 10) {
              i++
              continue
            }
            
            const serialMatch = line.match(/^\s*(\d+)\s+(.*)$/)
            if (serialMatch) {
              const serialNum = parseInt(serialMatch[1])
              let productLine = serialMatch[2]
              
              if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim()
                if (nextLine.startsWith('@') || nextLine.toLowerCase().includes('off')) {
                  i++
                } else if (!/\d/.test(nextLine)) {
                  productLine += ' ' + nextLine
                  i++
                }
              }
              
              let productName = ''
              let hsn = ''
              let quantity = 1
              let costPrice = 0
              
              const numMatches = productLine.match(/[\d,]+(?:\.\d+)?/g)
              if (numMatches) {
                const nums = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n))
                console.log('Numbers in line:', nums)
                
                let hsnIndex = -1
                for (let j = 0; j < nums.length; j++) {
                  const numStr = nums[j].toString()
                  if (numStr.length >= 6 && numStr.length <= 8) {
                    hsn = numStr
                    hsnIndex = j
                    break
                  }
                }
                
                const qtyMatch = productLine.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i)
                if (qtyMatch) {
                  quantity = parseInt(qtyMatch[1])
                } else {
                  for (let j = 0; j < nums.length; j++) {
                    if (j !== hsnIndex && nums[j] > 0 && nums[j] < 10000) {
                      quantity = Math.round(nums[j])
                      break
                    }
                  }
                }
                
                const priceCandidates = nums.filter((n, j) => j !== hsnIndex && n > 0 && n !== quantity)
                if (priceCandidates.length >= 2) {
                  priceCandidates.sort((a, b) => a - b)
                  costPrice = priceCandidates[0]
                } else if (priceCandidates.length === 1) {
                  costPrice = priceCandidates[0]
                }
              }
              
              productName = productLine
                .replace(/[\d,₹$€%\-.()@]/g, ' ')
                .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim()
              
              console.log('Parsed product:', { productName, hsn, quantity, costPrice })
              
              if (productName.length > 2 && quantity > 0) {
                items.push({
                  productName,
                  sku: '',
                  hsn,
                  batchNo: '',
                  expiryDate: null,
                  costPrice,
                  gstPercentage: 0,
                  quantity
                })
              }
            }
            
            i++
          }
        }
        
        console.log('Final items extracted from PDF:', items)
        
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr)
        jsonDataWithHeaders = [{ pdfError: pdfErr.message, stack: pdfErr.stack }]
      }
    } else {
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      console.log('Raw Excel data (array of arrays):', jsonData)
      
      jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet)
      console.log('Excel data with headers:', jsonDataWithHeaders)

      // Support for many column header variations
      items = jsonDataWithHeaders.map((row) => {
        const getVal = (keys) => {
          for (const key of keys) {
            if (row[key] !== undefined) {
              return row[key]
            }
          }
          return ''
        }

        const getNumVal = (keys) => {
          for (const key of keys) {
            if (row[key] !== undefined) {
              const val = row[key]
              if (typeof val === 'number') return val
              if (typeof val === 'string') {
                const parsed = parseFloat(val.replace(/[₹$€,]/g, ''))
                if (!isNaN(parsed)) return parsed
              }
            }
          }
          return 0
        }

        const getIntVal = (keys) => {
          for (const key of keys) {
            if (row[key] !== undefined) {
              const val = row[key]
              if (typeof val === 'number') return Math.round(val)
              if (typeof val === 'string') {
                const parsed = parseInt(val.replace(/[₹$€,]/g, ''))
                if (!isNaN(parsed)) return parsed
              }
            }
          }
          return 0
        }

        return {
          productName: getVal(['Product Name', 'ProductName', 'name', 'Name', 'Item', 'item', 'Item Name', 'Product', 'Description']),
          sku: getVal(['SKU', 'sku', 'Sku', 'Item Code', 'ItemCode', 'Product Code', 'Code', 'Item No']),
          batchNo: getVal(['Batch', 'Batch No', 'batchNo', 'batch', 'Batch Number']),
          expiryDate: getVal(['Expiry', 'Expiry Date', 'expiryDate', 'expiry', 'Expiration Date']),
          hsn: (getVal(['HSN', 'HSN No', 'HSN Code', 'hsn']) || '').toString().trim(),
          costPrice: getNumVal(['Cost Price', 'costPrice', 'cost', 'Cost', 'Rate', 'rate', 'MRP', 'Price']),
          gstPercentage: getNumVal(['GST%', 'GST', 'gstPercentage', 'gst', 'Tax', 'Tax%']),
          quantity: getIntVal(['Quantity', 'Qty', 'quantity', 'qty', 'Stock', 'stock', 'Qty.'])
        }
      }).filter(item => item.sku || item.productName)
    }

    if (items.length === 0) {
      return res.status(400).json({ 
        error: 'No valid items found in file', 
        rawData: jsonDataWithHeaders,
        message: 'Make sure your file has product information'
      })
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)
    
    const purchaseLedger = await prisma.purchaseLedger.create({
      data: {
        supplierName,
        supplierId,
        invoiceNo: `PUR-${Date.now()}`,
        totalAmount,
        distributorId
      }
    })
    
    await prisma.distributor.update({
      where: { id: distributorId },
      data: {
        totalCompanyDebits: { increment: totalAmount },
        pendingCompanyBalance: { increment: totalAmount }
      }
    })

    const results = []

    for (const item of items) {
      let product
      let wasExistingProduct = false
      
      console.log('=== Processing distributor purchase item ===')
      console.log('Raw item:', item)
      
      // Clean product name
      const cleanedProductName = item.productName 
        ? item.productName.trim().replace(/\s{2,}/g, ' ') 
        : ''
      console.log('Cleaned product name:', cleanedProductName)
      
      // First check by SKU if available
      if (item.sku) {
        product = await prisma.product.findFirst({
          where: { 
            distributorId,
            sku: item.sku 
          }
        })
        console.log('Found existing distributor product by SKU:', product ? { id: product.id, sku: product.sku, currentStock: product.currentStock, name: product.name } : null)
      }
      
      // If no SKU match, check by product name
      if (!product && cleanedProductName) {
        product = await prisma.product.findFirst({
          where: { 
            distributorId,
            name: { equals: cleanedProductName, mode: 'insensitive' }
          }
        })
        console.log('Found existing distributor product by name:', product ? { id: product.id, name: product.name, currentStock: product.currentStock } : null)
      }
      
      if (product) {
        wasExistingProduct = true
        console.log('Updating existing product with quantity:', item.quantity)
        // Update existing product stock
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice,
            name: cleanedProductName || product.name,
            hsn: item.hsn || product.hsn || '',
            batchNo: item.batchNo || product.batchNo,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : product.expiryDate,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage
          }
        })
        console.log('Updated distributor product:', { id: product.id, currentStock: product.currentStock })
      } else {
        wasExistingProduct = false
        console.log('Creating new product with name:', cleanedProductName)
        // Create new product
        product = await prisma.product.create({
          data: {
            name: cleanedProductName || 'Unnamed Product',
            sku: item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hsn: item.hsn || '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            distributorId
          }
        })
        console.log('Created new distributor product:', { id: product.id, sku: product.sku, name: product.name, currentStock: product.currentStock })
      }

      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchaseLedger.id,
          productId: product.id,
          qty: item.quantity,
          costPrice: item.costPrice,
          batchNo: item.batchNo || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          distributorId
        }
      })

      results.push({
        product,
        quantityAdded: item.quantity,
        action: wasExistingProduct ? 'updated' : 'created'
      })
    }

    res.json(convertDecimals({
      message: 'File processed successfully',
      purchase: purchaseLedger,
      itemsProcessed: results.length,
      items: results
    }))

  } catch (error) {
    console.error('Error processing file:', error)
    res.status(500).json({ error: 'Failed to process file' })
  }
})

router.post('/distributors/:distributorId/products', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    const product = await prisma.product.create({
      data: {
        ...req.body,
        distributorId
      }
    })
    res.status(201).json(convertDecimals(product))
  } catch (error) {
    console.error('Failed to create product:', error)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// CSA Purchase Returns Endpoints
router.get('/distributors/:distributorId/purchase-returns', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: { distributorId },
      include: {
        purchaseReturnItems: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(purchaseReturns))
  } catch (error) {
    console.error('Failed to fetch purchase returns:', error)
    res.status(500).json({ error: 'Failed to fetch purchase returns' })
  }
})

router.post('/distributors/:distributorId/purchase-returns/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId
    const { items, reason, isInterState } = req.body

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    const lastReturn = await prisma.purchaseReturn.findFirst({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })
    let returnNo = 'PR-001'
    if (lastReturn) {
      const lastNum = parseInt(lastReturn.returnNo.split('-')[1]) || 0
      returnNo = `PR-${String(lastNum + 1).padStart(3, '0')}`
    }

    let totalTaxable = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    let grandTotal = 0

    const processedItems = items.map(item => {
      const costPrice = getNum(item.costPrice)
      const qty = item.qty
      const gstPercentage = getNum(item.gstPercentage)
      const taxable = qty * costPrice
      const gstAmount = (taxable * gstPercentage) / 100
      let cgst = 0, sgst = 0, igst = 0

      if (isInterState) {
        igst = gstAmount
      } else {
        cgst = gstAmount / 2
        sgst = gstAmount / 2
      }

      const total = taxable + cgst + sgst + igst
      
      totalTaxable += taxable
      totalCGST += cgst
      totalSGST += sgst
      totalIGST += igst
      grandTotal += total

      return {
        productId: item.productId,
        qty,
        costPrice,
        gstPercentage,
        total
      }
    })

    const purchaseReturn = await prisma.purchaseReturn.create({
      data: {
        returnNo,
        distributorId,
        reason,
        taxableValue: totalTaxable,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        grandTotal,
        purchaseReturnItems: {
          create: processedItems.map(item => ({
            ...item,
            distributorId
          }))
        }
      },
      include: {
        purchaseReturnItems: { include: { product: true } }
      }
    })

    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { decrement: item.qty }
        }
      })
    }

    res.json(convertDecimals(purchaseReturn))
  } catch (error) {
    console.error('Failed to create purchase return:', error)
    res.status(500).json({ error: 'Failed to create purchase return' })
  }
})

// CSA Reports Endpoints
router.get('/my-reports/party-sales', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    
    let dateFilter = {}
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(`${startDate}T00:00:00`)
      }
      if (endDate) {
        dateFilter.lte = new Date(`${endDate}T23:59:59.999`)
      }
    } else {
      // Default to last 30 days, but correctly handle local dates
      const now = new Date()
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    const distributors = await prisma.distributor.findMany({
      where: { csaId },
      include: {
        invoices: { 
          where: { date: dateFilter }
        }
      }
    })

    const partySales = distributors.map(distributor => {
      const totalBilling = distributor.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
      return {
        partyId: distributor.id,
        partyName: distributor.companyName,
        gstin: distributor.gstIn,
        phone: distributor.phone,
        totalBilling,
        invoiceCount: distributor.invoices.length
      }
    })

    res.json(convertDecimals(partySales.sort((a, b) => b.totalBilling - a.totalBilling)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch party sales' })
  }
})

router.get('/my-reports/product-sales', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    
    let dateFilter = {}
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(`${startDate}T00:00:00`)
      }
      if (endDate) {
        dateFilter.lte = new Date(`${endDate}T23:59:59.999`)
      }
    } else {
      const now = new Date()
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    // Get ALL distributors linked to this CSA
    const distributorIds = (await prisma.distributor.findMany({
      where: { csaId },
      select: { id: true }
    })).map(d => d.id)

    // Query invoice items directly (including both distributor-linked and CSA-created invoices)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          OR: [
            { distributorId: { in: distributorIds } },
            { createdById: csaId }
          ],
          date: dateFilter
        }
      },
      include: {
        product: true,
        invoice: true
      }
    })

    const productMap = new Map()
    
    invoiceItems.forEach(item => {
      const key = item.productId
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: item.productId,
          productName: item.product?.name || 'Unknown',
          sku: item.product?.sku || '',
          totalQtySold: 0,
          totalRevenue: 0,
          totalCost: 0
        })
      }
      const existing = productMap.get(key)
      existing.totalQtySold += item.qty
      existing.totalRevenue += getNum(item.total)
      if (item.product?.costPrice) {
        existing.totalCost += item.qty * getNum(item.product.costPrice)
      }
    })

    const productSales = Array.from(productMap.values()).map(ps => ({
      ...ps,
      profitMargin: ps.totalRevenue > 0 ? ((ps.totalRevenue - ps.totalCost) / ps.totalRevenue * 100).toFixed(2) : 0
    }))

    res.json(convertDecimals(productSales.sort((a, b) => b.totalRevenue - a.totalRevenue)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch product sales' })
  }
})

router.get('/my-reports/inventory', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    
    let dateFilter = {}
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(`${startDate}T00:00:00`)
      }
      if (endDate) {
        dateFilter.lte = new Date(`${endDate}T23:59:59.999`)
      }
    } else {
      const now = new Date()
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    const distributors = await prisma.distributor.findMany({
      where: { csaId },
      include: {
        products: {
          include: {
            invoiceItems: { where: { invoice: { date: dateFilter } } },
            purchaseItems: { where: { purchase: { date: dateFilter } } }
          }
        }
      }
    })

    const inventoryData = []
    let totalValue = 0

    distributors.forEach(distributor => {
      distributor.products.forEach(product => {
        const totalPurchases = product.purchaseItems.reduce((sum, pi) => sum + pi.qty, 0)
        const totalSales = product.invoiceItems.reduce((sum, ii) => sum + ii.qty, 0)
        const openingStock = product.currentStock - totalPurchases + totalSales
        const closingStock = product.currentStock
        const value = closingStock * getNum(product.costPrice)

        inventoryData.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          openingStock,
          purchases: totalPurchases,
          sales: totalSales,
          closingStock,
          value
        })
        totalValue += value
      })
    })

    // Also include products that have csaId but no distributorId
    const csaOnlyProducts = await prisma.product.findMany({
      where: { csaId, distributorId: null },
      include: {
        invoiceItems: { where: { invoice: { date: dateFilter } } },
        purchaseItems: { where: { purchase: { date: dateFilter } } }
      }
    })

    csaOnlyProducts.forEach(product => {
      const totalPurchases = product.purchaseItems.reduce((sum, pi) => sum + pi.qty, 0)
      const totalSales = product.invoiceItems.reduce((sum, ii) => sum + ii.qty, 0)
      const openingStock = product.currentStock - totalPurchases + totalSales
      const closingStock = product.currentStock
      const value = closingStock * getNum(product.costPrice)

      inventoryData.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        openingStock,
        purchases: totalPurchases,
        sales: totalSales,
        closingStock,
        value
      })
      totalValue += value
    })

    res.json(convertDecimals({
      startDate: dateFilter.gte ? dateFilter.gte.toISOString() : null,
      endDate: dateFilter.lte ? dateFilter.lte.toISOString() : null,
      inventory: inventoryData,
      totalValue
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch inventory report' })
  }
})

router.get('/my-reports/party-product-sales/:partyId', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { partyId } = req.params
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    
    let dateFilter = {}
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(`${startDate}T00:00:00`)
      }
      if (endDate) {
        dateFilter.lte = new Date(`${endDate}T23:59:59.999`)
      }
    } else {
      const now = new Date()
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    const distributor = await prisma.distributor.findFirst({ 
      where: { id: partyId, csaId }
    })
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          distributorId: partyId,
          date: dateFilter
        }
      },
      include: {
        product: true,
        invoice: true
      },
      orderBy: { invoice: { date: 'desc' } }
    })

    const productSales = []
    invoiceItems.forEach(item => {
      const existing = productSales.find(ps => ps.productId === item.productId)
      if (existing) {
        existing.totalQty += item.qty
        existing.orders.push({
          date: item.invoice.date,
          invoiceNo: item.invoice.invoiceNo,
          qty: item.qty,
          rate: item.rate
        })
      } else {
        productSales.push({
          productId: item.productId,
          productName: item.product?.name || 'Unknown',
          sku: item.product?.sku || '',
          totalQty: item.qty,
          orders: [{
            date: item.invoice.date,
            invoiceNo: item.invoice.invoiceNo,
            qty: item.qty,
            rate: item.rate
          }]
        })
      }
    })

    res.json(convertDecimals(productSales))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch party product sales' })
  }
})

router.get('/my-reports/party-ledger/:partyId', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { partyId } = req.params
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    
    const distributor = await prisma.distributor.findFirst({ 
      where: { id: partyId, csaId }
    })
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    let start, end
    if (startDate) {
      start = new Date(`${startDate}T00:00:00`)
    } else {
      const now = new Date()
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
    }
    
    if (endDate) {
      end = new Date(`${endDate}T23:59:59.999`)
    } else {
      const now = new Date()
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    // Fetch all relevant data in parallel
    const [invoices, salesReturns, paymentsIn, openingInvoices, openingSalesReturns, openingPaymentsIn] = await Promise.all([
      prisma.invoice.findMany({
        where: { 
          distributorId: partyId,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.salesReturn.findMany({
        where: { 
          distributorId: partyId,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.paymentIn.findMany({
        where: { 
          distributorId: partyId,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.invoice.findMany({
        where: {
          distributorId: partyId,
          date: { lt: start }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.salesReturn.findMany({
        where: {
          distributorId: partyId,
          date: { lt: start }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.paymentIn.findMany({
        where: {
          distributorId: partyId,
          date: { lt: start }
        },
        orderBy: { date: 'asc' }
      })
    ])

    const openingDebit = openingInvoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
    const openingCredit = openingSalesReturns.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0) +
      openingPaymentsIn.reduce((sum, pin) => sum + getNum(pin.amount), 0)
    const openingBalance = openingDebit - openingCredit

    // Combine and sort all ledger entries
    const ledgerEntries = []

    if (openingBalance !== 0) {
      ledgerEntries.push({
        id: 'opening-balance',
        date: start,
        type: 'Opening Balance',
        refNo: '-',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        balance: 0
      })
    }
    
    // Add invoices (debit - distributor owes)
    invoices.forEach(inv => {
      ledgerEntries.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        type: 'Invoice',
        refNo: inv.invoiceNo,
        debit: getNum(inv.grandTotal),
        credit: 0,
        balance: 0
      })
    })

    // Add sales returns (credit - we owe distributor)
    salesReturns.forEach(sr => {
      ledgerEntries.push({
        id: `sr-${sr.id}`,
        date: sr.date,
        type: 'Sales Return',
        refNo: sr.returnNo,
        debit: 0,
        credit: getNum(sr.grandTotal),
        balance: 0
      })
    })

    // Add payments in (credit - distributor paid)
    paymentsIn.forEach(pin => {
      ledgerEntries.push({
        id: `pin-${pin.id}`,
        date: pin.date,
        type: 'Payment Received',
        refNo: pin.paymentNo,
        debit: 0,
        credit: getNum(pin.amount),
        balance: 0
      })
    })

    // Sort all entries by date
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Calculate running balance
    let runningBalance = openingBalance
    ledgerEntries.forEach(entry => {
      if (entry.type === 'Opening Balance') {
        entry.balance = runningBalance
        return
      }
      runningBalance += entry.debit - entry.credit
      entry.balance = runningBalance
    })

    // Calculate summary
    const totalDebit = invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
    const totalCredit = salesReturns.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0) + 
                       paymentsIn.reduce((sum, pin) => sum + getNum(pin.amount), 0)
    const periodNet = totalDebit - totalCredit
    const closingBalance = openingBalance + periodNet

    res.json(convertDecimals({
      party: distributor,
      ledgerEntries,
      summary: {
        openingBalance,
        totalDebit,
        totalCredit,
        periodNet,
        closingBalance
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch party ledger' })
  }
})

// CSA Payments Out Endpoints
router.get('/distributors/:distributorId/payments-out', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId

    // Verify CSA has access to this distributor
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    const paymentsOut = await prisma.paymentOut.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(paymentsOut))
  } catch (error) {
    console.error('Failed to fetch payments out:', error)
    res.status(500).json({ error: 'Failed to fetch payments out' })
  }
})

router.post('/distributors/:distributorId/payments-out/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { distributorId } = req.params
    const csaId = req.user.userId
    const { amount, paymentMode, referenceNo, notes } = req.body

    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or access denied' })
    }

    if (!amount || !paymentMode) {
      return res.status(400).json({ error: 'Amount and payment mode are required' })
    }

    const lastPayment = await prisma.paymentOut.findFirst({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })
    let paymentNo = 'PO-001'
    if (lastPayment) {
      const lastNum = parseInt(lastPayment.paymentNo.split('-')[1]) || 0
      paymentNo = `PO-${String(lastNum + 1).padStart(3, '0')}`
    }

    const paymentOut = await prisma.paymentOut.create({
      data: {
        paymentNo,
        distributorId,
        amount,
        paymentMode,
        referenceNo,
        notes
      }
    })

    res.json(convertDecimals(paymentOut))
  } catch (error) {
    console.error('Failed to create payment out:', error)
    res.status(500).json({ error: 'Failed to create payment out' })
  }
})

// ===================== CSA's OWN PERSONAL DATA ENDPOINTS =====================

// CSA's own purchases
router.get('/my-purchases', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const purchases = await prisma.purchaseLedger.findMany({
      where: { csaId },
      include: { purchaseItems: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(purchases))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSA purchases' })
  }
})

// CSA's own suppliers
router.get('/my-suppliers', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    
    // Get suppliers that are either:
    // 1. Directly linked to this CSA, OR
    // 2. Marked as isForAllCSAs
    const suppliers = await prisma.supplier.findMany({
      where: {
        OR: [
          { csaId },
          { isForAllCSAs: true }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Return the suppliers
    res.json(convertDecimals(suppliers))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

// CSA's own purchase upload
router.post('/my-purchases/upload', authenticateToken, requireCSA, upload.single('file'), async (req, res) => {
  let filePath;
  
  try {
    const csaId = req.user.userId
    console.log('=== POST /my-purchases/upload - CSA ID:', csaId)

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    
    filePath = req.file.path;

    const supplierName = req.body.supplierName || 'Supplier'
    const supplierId = req.body.supplierId || null
    
    let items = []
    let jsonDataWithHeaders = []
    const fs = require('fs')
    
    // Check file type - extension, mimetype, AND file signature "%PDF-"
    const dataBuffer = fs.readFileSync(filePath)
    const isPdfFromExtension = req.file.originalname.toLowerCase().endsWith('.pdf')
    const isPdfFromMimetype = req.file.mimetype && req.file.mimetype.toLowerCase().includes('pdf')
    const isPdfFromSignature = dataBuffer.slice(0, 4).equals(Buffer.from('%PDF'))
    const isPdf = isPdfFromExtension || isPdfFromMimetype || isPdfFromSignature
    
    console.log('Is PDF check:', { 
      isPdfFromExtension, 
      isPdfFromMimetype, 
      isPdfFromSignature, 
      isPdf,
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype,
      first4Bytes: dataBuffer.slice(0, 4).toString()
    })
    
    if (isPdf) {
      const pdfParse = require('pdf-parse')
      
      try {
        const data = await pdfParse(dataBuffer)
        console.log('=== FULL PDF TEXT ===')
        console.log(data.text)
        jsonDataWithHeaders = [{ pdfText: data.text }]
        
        // Try to parse table-like data from PDF text
        const lines = data.text.split(/\r?\n/).filter(line => line.trim())
        console.log('=== PDF LINES ===')
        console.log(lines)
        
        // First, let's find the header row - looking for "Items", "HSN", "Qty" etc.
        let headerRowIndex = -1
        const headerPatterns = [
          ['no', 'items', 'hsn', 'qty'],
          ['item', 'product', 'hsn', 'quantity'],
          ['sl', 'description', 'hsn', 'qty'],
          ['serial', 'product', 'hsn', 'rate'],
          ['no', 'items', 'hsn no', 'qty'],
          ['no', 'items', 'hsn no.', 'qty.'],
        ]
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase()
          for (const pattern of headerPatterns) {
            const matches = pattern.filter(keyword => line.includes(keyword)).length
            if (matches >= 3) {
              headerRowIndex = i
              break
            }
          }
          if (headerRowIndex !== -1) break
        }
        
        if (headerRowIndex !== -1) {
          console.log('Found header row at index', headerRowIndex, lines[headerRowIndex])
          
          // Now let's parse the data rows, handling multi-line items
          let tempItems = []
          let currentItem = null
          let pastItems = false
          for (let i = headerRowIndex + 1; i < lines.length; i++) {
            const line = lines[i]
            console.log('Processing line:', line)
            
            // Stop processing once we hit subtotal or total
            if (line.toLowerCase().includes('subtotal') || line.toLowerCase().includes('total')) {
              pastItems = true
            }
            if (pastItems) {
              continue
            }
            
            // Skip if line looks like a footer or not relevant
            if (line.toLowerCase().includes('terms') ||
                line.toLowerCase().includes('received') ||
                line.toLowerCase().includes('invoice') ||
                line.toLowerCase().includes('original') ||
                line.length < 3) {
              continue
            }
            
            // Check if this is a new item line (starts with a number, optional space, and has non-numeric/symbol content)
            const newItemMatch = line.match(/^(\d+)\s*(.*)/)
            if (newItemMatch) {
              const itemNumber = newItemMatch[1]
              const restOfLine = newItemMatch[2]
              // Check if restOfLine has at least some letters
              const hasLetters = /[a-zA-Z]/.test(restOfLine)
              if (hasLetters) {
                // Save previous item if exists
                if (currentItem && currentItem.productName) {
                  tempItems.push(currentItem)
                }
              } else {
                // Treat as continuation line if currentItem exists
                if (currentItem) {
                  // Check if this line has rate or tax info
                  const rateMatch = line.match(/([\d,]+\.\d{2})/)
                  if (rateMatch) {
                    currentItem.costPrice = parseFloat(rateMatch[1].replace(/,/g, ''))
                  }
                  const gstMatch = line.match(/(\d+)\s*%/)
                  if (gstMatch) {
                    currentItem.gstPercentage = parseFloat(gstMatch[1])
                  }
                }
                continue
              }
              
              // Extract HSN first
              let hsn = ''
              const hsnMatch = restOfLine.match(/(\d{6,8})/)
              if (hsnMatch) {
                hsn = hsnMatch[1]
              }
              
              // Extract quantity - remove HSN first to avoid matching it
              let quantity = 1
              let tempRestOfLine = restOfLine.replace(hsn, '')
              const qtyMatch = tempRestOfLine.match(/(\d+)(?=\s*PCS)/i) || 
                               tempRestOfLine.match(/(\d+)(?=\s*NOS)/i) ||
                               tempRestOfLine.match(/(\d+)(?=\s*QTY)/i)
              if (qtyMatch) {
                quantity = parseInt(qtyMatch[1])
              }
              
              // Extract product name
              let productName = restOfLine
                .replace(hsn, '') // remove HSN
                .replace(/\d+\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/gi, '') // remove quantity
                .replace(/\d/g, '') // remove remaining numbers
                .replace(/[₹$€%,\-–()\.\/\t-]/g, '') // remove symbols
                .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '') // remove keywords
                .trim()
              
              productName = productName.replace(/\s{2,}/g, ' ').trim()
              
              currentItem = {
                productName,
                sku: '',
                hsn,
                batchNo: '',
                expiryDate: null,
                costPrice: 0,
                gstPercentage: 0,
                quantity
              }
            } else if (currentItem) {
              // This is a continuation line of current item
              // Check if line has rate or tax info
              const rateMatch = line.match(/([\d,]+\.\d{2})/)
              if (rateMatch) {
                currentItem.costPrice = parseFloat(rateMatch[1].replace(/,/g, ''))
              }
              const gstMatch = line.match(/(\d+)\s*%/)
              if (gstMatch) {
                currentItem.gstPercentage = parseFloat(gstMatch[1])
              }
              
              // Also check if product name needs to be extended
              const moreName = line
                .replace(/\d/g, '')
                .replace(/[₹$€%,\-–()\.\/\t-]/g, '')
                .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '')
                .trim()
              if (moreName.length > 0) {
                currentItem.productName += ' ' + moreName
                currentItem.productName = currentItem.productName.replace(/\s{2,}/g, ' ').trim()
              }
            }
          }
          
          // Add last item if exists
          if (currentItem && currentItem.productName) {
            tempItems.push(currentItem)
          }
          
          // Now filter tempItems to have valid items
          items = tempItems.filter(item => item.productName.length > 2)
          console.log('Temp items:', tempItems)
        }
        
        // If no items found with header, try a different approach
        if (items.length === 0) {
          console.log('No header found, trying line-by-line approach')
          let tempItems = []
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            // Look for lines with multiple numbers (quantity + price)
            const numMatches = line.match(/[\d,]+\.\d{2}/)
            if (numMatches) {
              let quantity = 1
              let costPrice = 0
              
              // Try to find quantity first (smaller number)
              const nums = line.match(/\d+/g)
              if (nums && nums.length >= 2) {
                const numValues = nums.map(n => parseInt(n)).filter(n => !isNaN(n))
                // First number could be quantity, second could be price
                if (numValues[0] < 10000) { // Assume quantity <10k
                  quantity = Math.round(numValues[0])
                }
              }
              
              // Extract rate
              const rateMatch = line.match(/[\d,]+\.\d{2}/)
              if (rateMatch) {
                costPrice = parseFloat(rateMatch[0].replace(/,/g, ''))
              }
              
              // Extract product name
              let productName = line
                .replace(/[\d,₹$€%\-.()]/g, '')
                .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '')
                .trim()
              
              if (productName.length > 2) {
                tempItems.push({
                  productName,
                  sku: '',
                  hsn: '',
                  batchNo: '',
                  expiryDate: null,
                  costPrice,
                  gstPercentage: 0,
                  quantity
                })
              }
            }
          }
          items = tempItems
        }
        
        console.log('Final items extracted from PDF:', items)
        
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr)
        jsonDataWithHeaders = [{ pdfError: pdfErr.message, stack: pdfErr.stack }]
      }
    } else {
      // Read Excel file
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      console.log('Raw Excel data (array of arrays):', jsonData)
      
      jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet)
      console.log('Excel data with headers:', jsonDataWithHeaders)

      // Support many column header variations
      items = jsonDataWithHeaders.map((row) => ({
        productName: row['Product Name'] || row['ProductName'] || row['name'] || row['Name'] || row['Item'] || row['item'] || row['Item Name'] || row['Product'] || row['Description'] || '',
        sku: row['SKU'] || row['sku'] || row['Sku'] || row['Item Code'] || row['ItemCode'] || row['Product Code'] || row['Code'] || row['Item No'] || '',
        batchNo: row['Batch'] || row['Batch No'] || row['batchNo'] || row['batch'] || row['Batch Number'] || '',
        expiryDate: row['Expiry'] || row['Expiry Date'] || row['expiryDate'] || row['expiry'] || row['Expiration Date'] || null,
        hsn: (row['HSN'] || row['HSN No'] || row['HSN Code'] || row['hsn'] || '').toString().trim(),
        costPrice: (typeof row['Cost Price'] === 'number') ? row['Cost Price'] : (typeof row['costPrice'] === 'number') ? row['costPrice'] : (typeof row['cost'] === 'number') ? row['cost'] : (typeof row['Cost'] === 'number') ? row['Cost'] : (typeof row['Rate'] === 'number') ? row['Rate'] : (typeof row['rate'] === 'number') ? row['rate'] : (typeof row['MRP'] === 'number') ? row['MRP'] : (typeof row['Price'] === 'number') ? row['Price'] : parseFloat(row['Cost Price'] || row['costPrice'] || row['cost'] || row['Cost'] || row['Rate'] || row['rate'] || row['MRP'] || row['Price'] || 0),
        gstPercentage: (typeof row['GST%'] === 'number') ? row['GST%'] : (typeof row['GST'] === 'number') ? row['GST'] : (typeof row['gstPercentage'] === 'number') ? row['gstPercentage'] : (typeof row['gst'] === 'number') ? row['gst'] : (typeof row['Tax'] === 'number') ? row['Tax'] : (typeof row['Tax%'] === 'number') ? row['Tax%'] : parseFloat(row['GST%'] || row['GST'] || row['gstPercentage'] || row['gst'] || row['Tax'] || row['Tax%'] || 0),
        quantity: (typeof row['Quantity'] === 'number') ? row['Quantity'] : (typeof row['Qty'] === 'number') ? row['Qty'] : (typeof row['quantity'] === 'number') ? row['quantity'] : (typeof row['qty'] === 'number') ? row['qty'] : (typeof row['Stock'] === 'number') ? row['Stock'] : (typeof row['stock'] === 'number') ? row['stock'] : parseInt(row['Quantity'] || row['Qty'] || row['quantity'] || row['qty'] || row['Stock'] || row['stock'] || 0)
      })).filter(item => item.sku || item.productName)
      console.log('Processed items:', items)
    }

    if (items.length === 0) {
      return res.status(400).json({ 
        error: 'No valid items found in file', 
        rawData: jsonDataWithHeaders,
        message: 'Make sure your file has product information'
      })
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)
    
    const purchaseLedger = await prisma.purchaseLedger.create({
      data: {
        supplierName,
        supplierId,
        invoiceNo: `PUR-${Date.now()}`,
        totalAmount,
        csaId
      }
    })
    console.log('Created purchase ledger:', purchaseLedger.id)

    const results = []

    for (const item of items) {
      let product
      console.log('=== Processing item ===')
      console.log('Raw item:', item)
      
      // Clean product name - remove extra spaces, trim
      const cleanedProductName = item.productName 
        ? item.productName.trim().replace(/\s{2,}/g, ' ') 
        : ''
      
      console.log('Cleaned product name:', cleanedProductName)
      
      let wasExistingProduct = false
      // First check by SKU if available
      if (item.sku) {
        product = await prisma.product.findFirst({
          where: { csaId, sku: item.sku }
        })
        console.log('Found existing CSA product by SKU:', product ? { id: product.id, sku: product.sku, currentStock: product.currentStock, name: product.name } : null)
      }
      
      // If no SKU match, check by product name (case-insensitive, trimmed)
      if (!product && cleanedProductName) {
        product = await prisma.product.findFirst({
          where: { 
            csaId, 
            name: { equals: cleanedProductName, mode: 'insensitive' }
          }
        })
        console.log('Found existing CSA product by name:', product ? { id: product.id, name: product.name, currentStock: product.currentStock } : null)
      }
      
      if (product) {
        wasExistingProduct = true
        console.log('Updating existing product with quantity:', item.quantity)
        // Update existing product stock
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice,
            name: cleanedProductName || product.name,
            hsn: item.hsn || product.hsn || '',
            batchNo: item.batchNo || product.batchNo,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : product.expiryDate,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage
          }
        })
        console.log('Updated product:', { id: product.id, currentStock: product.currentStock })
      } else {
        wasExistingProduct = false
        console.log('Creating new product with name:', cleanedProductName)
        // Create new product
        product = await prisma.product.create({
          data: {
            name: cleanedProductName || 'Unnamed Product',
            sku: item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hsn: item.hsn || '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            csaId
          }
        })
        console.log('Created new product:', { id: product.id, sku: product.sku, name: product.name, currentStock: product.currentStock })
      }

      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchaseLedger.id,
          productId: product.id,
          qty: item.quantity,
          costPrice: item.costPrice,
          batchNo: item.batchNo || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          csaId
        }
      })

      results.push({
        product,
        quantityAdded: item.quantity,
        action: wasExistingProduct ? 'updated' : 'created'
      })
    }

    res.json(convertDecimals({
      message: 'File processed successfully',
      purchase: purchaseLedger,
      itemsProcessed: results.length,
      items: results
    }))

  } catch (error) {
    console.error('Error processing file:', error)
    res.status(500).json({ error: 'Failed to process file', details: error.message })
  } finally {
    // Always cleanup uploaded file
    if (filePath) {
      try {
        const fs = require('fs')
        fs.unlinkSync(filePath)
        console.log('Cleaned up uploaded file:', filePath)
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError)
      }
    }
  }
})

// Get single purchase
router.get('/my-purchases/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const csaId = req.user.userId
    const purchase = await prisma.purchaseLedger.findUnique({
      where: { id },
      include: { purchaseItems: { include: { product: true } } }
    })
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' })
    }
    if (purchase.csaId !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    res.json(convertDecimals(purchase))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch purchase' })
  }
})

// Delete purchase
router.delete('/my-purchases/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { id } = req.params
    const csaId = req.user.userId
    const existingPurchase = await prisma.purchaseLedger.findUnique({
      where: { id },
      include: { purchaseItems: true }
    })
    if (!existingPurchase) {
      return res.status(404).json({ error: 'Purchase not found' })
    }
    if (existingPurchase.csaId !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of existingPurchase.purchaseItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.qty } }
        })
      }
      // Delete purchase items first
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })
      // Delete purchase ledger
      await tx.purchaseLedger.delete({ where: { id } })
    })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete purchase' })
  }
})

// CSA's own products
router.get('/my-products', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    console.log('=== GET /my-products - CSA ID:', csaId)
    
    // Get CSA's own products
    const csaProducts = await prisma.product.findMany({
      where: { csaId },
      orderBy: { createdAt: 'desc' }
    })
    console.log('CSA products count:', csaProducts.length)
    console.log('CSA products:', csaProducts.map(p => ({ id: p.id, sku: p.sku, currentStock: p.currentStock })))
    
    console.log('Final result to send:', csaProducts)
    res.json(convertDecimals(csaProducts))
  } catch (error) {
    console.error('Error in /my-products:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

router.post('/my-products', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { sku } = req.body
    
    // Check if CSA already has a product with this SKU
    const existingProduct = await prisma.product.findFirst({
      where: { csaId, sku }
    })
    
    let product
    if (existingProduct) {
      // Update existing product
      product = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          ...req.body,
          csaId
        }
      })
    } else {
      // Create new product
      product = await prisma.product.create({
        data: {
          ...req.body,
          csaId
        }
      })
    }
    
    res.status(201).json(convertDecimals(product))
  } catch (error) {
    console.error('Failed to create product:', error)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// Update CSA's product
router.put('/my-products/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { id } = req.params
    
    const product = await prisma.product.update({
      where: { id, csaId },
      data: req.body
    })
    
    res.json(convertDecimals(product))
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    console.error('Failed to update product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// Delete CSA's product
router.delete('/my-products/:id', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { id } = req.params
    
    await prisma.product.delete({
      where: { id, csaId }
    })
    
    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    console.error('Failed to delete product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

// CSA's own parties
router.get('/my-parties', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const parties = await prisma.party.findMany({
      where: { csaId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(parties))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch parties' })
  }
})

router.post('/my-parties', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const party = await prisma.party.create({
      data: {
        ...req.body,
        csaId
      }
    })
    res.status(201).json(convertDecimals(party))
  } catch (error) {
    console.error('Failed to create party:', error)
    res.status(500).json({ error: 'Failed to create party' })
  }
})

// CSA's own invoices
router.get('/my-invoices', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const invoices = await prisma.invoice.findMany({
      where: { csaId },
      include: { 
        distributor: true, 
        invoiceItems: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(invoices))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

router.post('/my-invoices/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { items, isInterState, partyId } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    const lastInvoice = await prisma.invoice.findFirst({
      where: { csaId },
      orderBy: { invoiceNo: 'desc' }
    })
    const nextInvoiceNo = lastInvoice 
      ? `INV-${parseInt(lastInvoice.invoiceNo.split('-')[1]) + 1}`
      : 'INV-1001'

    const result = await prisma.$transaction(async (tx) => {
      let totalTaxable = 0
      let totalCGST = 0
      let totalSGST = 0
      let totalIGST = 0

      for (const item of items) {
        const taxable = item.qty * item.rate
        totalTaxable += taxable
        const gstAmount = (taxable * item.gstPercentage) / 100
        if (isInterState) {
          totalIGST += gstAmount
        } else {
          totalCGST += gstAmount / 2
          totalSGST += gstAmount / 2
        }
      }

      const grandTotal = totalTaxable + totalCGST + totalSGST + totalIGST

      const invoiceItemsData = items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        costPrice: item.costPrice,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        extraMarginPercentage: item.extraMarginPercentage || 0,
        total: (item.qty * item.rate) + ((item.qty * item.rate * item.gstPercentage) / 100),
        csaId
      }))

      // Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.qty } }
        })
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: nextInvoiceNo,
          csaId,
          partyId: partyId || null,
          createdById: csaId,
          date: new Date(),
          taxableValue: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          igst: totalIGST,
          grandTotal,
          invoiceItems: {
            create: invoiceItemsData
          }
        },
        include: { invoiceItems: { include: { product: true } } }
      })

      return invoice
    })

    res.status(201).json(convertDecimals(result))
  } catch (error) {
    console.error('Create invoice error:', error)
    res.status(500).json({ error: error.message || 'Failed to create invoice' })
  }
})

// Create sales return for specific distributor (CSA)
router.post('/distributors/:distributorId/sales-returns/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { distributorId } = req.params
    const { items, reason } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    // Verify distributor exists and is assigned to this CSA
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or not assigned to you' })
    }

    const lastReturn = await prisma.salesReturn.findFirst({
      where: { csaId },
      orderBy: { returnNo: 'desc' }
    })
    const nextReturnNo = lastReturn 
      ? `SR-${parseInt(lastReturn.returnNo.split('-')[1]) + 1}`
      : 'SR-1001'

    const result = await prisma.$transaction(async (tx) => {
      let totalTaxable = 0
      let totalCGST = 0
      let totalSGST = 0

      for (const item of items) {
        const taxable = item.qty * item.rate
        totalTaxable += taxable
        const gstAmount = (taxable * item.gstPercentage) / 100
        totalCGST += gstAmount / 2
        totalSGST += gstAmount / 2
      }

      const grandTotal = totalTaxable + totalCGST + totalSGST

      const salesReturnItemsData = items.map((item) => ({
        productId: item.productId,
        distributorId,
        qty: item.qty,
        costPrice: item.costPrice,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        total: (item.qty * item.rate) + ((item.qty * item.rate * item.gstPercentage) / 100),
        csaId
      }))

      // Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.qty } }
        })
      }

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo: nextReturnNo,
          csaId,
          distributorId,
          date: new Date(),
          reason: reason || null,
          taxableValue: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          grandTotal,
          salesReturnItems: {
            create: salesReturnItemsData
          }
        },
        include: { salesReturnItems: { include: { product: true } }, distributor: true }
      })

      return salesReturn
    })

    res.status(201).json(convertDecimals(result))
  } catch (error) {
    console.error('Create sales return error:', error)
    res.status(500).json({ error: error.message || 'Failed to create sales return' })
  }
})

// Create payment in for specific distributor (CSA)
router.post('/distributors/:distributorId/payments-in/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { distributorId } = req.params
    const { amount, paymentMode, referenceNo, notes } = req.body

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' })
    }

    // Verify distributor exists and is assigned to this CSA
    const distributor = await prisma.distributor.findFirst({
      where: { id: distributorId, csaId }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found or not assigned to you' })
    }

    const lastPayment = await prisma.paymentIn.findFirst({
      where: { csaId },
      orderBy: { paymentNo: 'desc' }
    })
    const nextPaymentNo = lastPayment 
      ? `PYT-${parseInt(lastPayment.paymentNo.split('-')[1]) + 1}`
      : 'PYT-1001'

    const paymentIn = await prisma.paymentIn.create({
      data: {
        paymentNo: nextPaymentNo,
        csaId,
        distributorId,
        date: new Date(),
        amount: parseFloat(amount),
        paymentMode,
        referenceNo: referenceNo || null,
        notes: notes || null
      },
      include: { distributor: true }
    })

    res.status(201).json(convertDecimals(paymentIn))
  } catch (error) {
    console.error('Create payment in error:', error)
    res.status(500).json({ error: error.message || 'Failed to create payment in' })
  }
})

// CSA's own sales returns
router.get('/my-sales-returns', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const salesReturns = await prisma.salesReturn.findMany({
      where: { csaId },
      include: {
        salesReturnItems: { include: { product: true } },
        party: true,
        distributor: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(salesReturns))
  } catch (error) {
    console.error('Get sales returns error:', error)
    res.status(500).json({ error: 'Failed to fetch sales returns' })
  }
})

router.post('/my-sales-returns/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { items, reason, partyId } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    const lastReturn = await prisma.salesReturn.findFirst({
      where: { csaId },
      orderBy: { returnNo: 'desc' }
    })
    const nextReturnNo = lastReturn 
      ? `SR-${parseInt(lastReturn.returnNo.split('-')[1]) + 1}`
      : 'SR-1001'

    const result = await prisma.$transaction(async (tx) => {
      let totalTaxable = 0
      let totalCGST = 0
      let totalSGST = 0

      for (const item of items) {
        const taxable = item.qty * item.rate
        totalTaxable += taxable
        const gstAmount = (taxable * item.gstPercentage) / 100
        totalCGST += gstAmount / 2
        totalSGST += gstAmount / 2
      }

      const grandTotal = totalTaxable + totalCGST + totalSGST

      const salesReturnItemsData = items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        costPrice: item.costPrice,
        rate: item.rate,
        gstPercentage: item.gstPercentage,
        total: (item.qty * item.rate) + ((item.qty * item.rate * item.gstPercentage) / 100),
        csaId
      }))

      // Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.qty } }
        })
      }

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo: nextReturnNo,
          csaId,
          partyId: partyId || null,
          date: new Date(),
          reason: reason || null,
          taxableValue: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          grandTotal,
          salesReturnItems: {
            create: salesReturnItemsData
          }
        },
        include: { salesReturnItems: { include: { product: true } } }
      })

      return salesReturn
    })

    res.status(201).json(convertDecimals(result))
  } catch (error) {
    console.error('Create sales return error:', error)
    res.status(500).json({ error: error.message || 'Failed to create sales return' })
  }
})

// CSA's own payments in
router.get('/my-payments-in', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const paymentsIn = await prisma.paymentIn.findMany({
      where: { csaId },
      include: { party: true, distributor: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(paymentsIn))
  } catch (error) {
    console.error('Get payments in error:', error)
    res.status(500).json({ error: 'Failed to fetch payments in' })
  }
})

router.post('/my-payments-in/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { amount, paymentMode, referenceNo, notes, partyId } = req.body

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' })
    }

    const lastPayment = await prisma.paymentIn.findFirst({
      where: { csaId },
      orderBy: { paymentNo: 'desc' }
    })
    const nextPaymentNo = lastPayment 
      ? `PYT-${parseInt(lastPayment.paymentNo.split('-')[1]) + 1}`
      : 'PYT-1001'

    const paymentIn = await prisma.paymentIn.create({
      data: {
        paymentNo: nextPaymentNo,
        csaId,
        partyId: partyId || null,
        date: new Date(),
        amount: parseFloat(amount),
        paymentMode,
        referenceNo: referenceNo || null,
        notes: notes || null
      }
    })

    res.status(201).json(convertDecimals(paymentIn))
  } catch (error) {
    console.error('Create payment in error:', error)
    res.status(500).json({ error: error.message || 'Failed to create payment in' })
  }
})

// CSA's own purchase returns
router.get('/my-purchase-returns', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: { csaId },
      include: {
        purchaseReturnItems: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(purchaseReturns))
  } catch (error) {
    console.error('Failed to fetch purchase returns:', error)
    res.status(500).json({ error: 'Failed to fetch purchase returns' })
  }
})

router.post('/my-purchase-returns/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { items, reason, isInterState, supplierName } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    const lastReturn = await prisma.purchaseReturn.findFirst({
      where: { csaId },
      orderBy: { createdAt: 'desc' }
    })
    let returnNo = 'PR-001'
    if (lastReturn) {
      const lastNum = parseInt(lastReturn.returnNo.split('-')[1]) || 0
      returnNo = `PR-${String(lastNum + 1).padStart(3, '0')}`
    }

    let totalTaxable = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    let grandTotal = 0

    const processedItems = items.map(item => {
      const costPrice = getNum(item.costPrice)
      const qty = item.qty
      const gstPercentage = getNum(item.gstPercentage)
      const taxable = qty * costPrice
      const gstAmount = (taxable * gstPercentage) / 100
      let cgst = 0, sgst = 0, igst = 0

      if (isInterState) {
        igst = gstAmount
      } else {
        cgst = gstAmount / 2
        sgst = gstAmount / 2
      }

      const total = taxable + cgst + sgst + igst
      
      totalTaxable += taxable
      totalCGST += cgst
      totalSGST += sgst
      totalIGST += igst
      grandTotal += total

      return {
        productId: item.productId,
        qty,
        costPrice,
        gstPercentage,
        total
      }
    })

    const purchaseReturn = await prisma.purchaseReturn.create({
      data: {
        returnNo,
        supplierName,
        csaId,
        reason,
        taxableValue: totalTaxable,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        grandTotal,
        purchaseReturnItems: {
          create: processedItems.map(item => ({
            ...item,
            csaId
          }))
        }
      },
      include: {
        purchaseReturnItems: { include: { product: true } }
      }
    })

    // Update product stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.qty } }
      })
    }

    res.json(convertDecimals(purchaseReturn))
  } catch (error) {
    console.error('Failed to create purchase return:', error)
    res.status(500).json({ error: 'Failed to create purchase return' })
  }
})

// CSA's own payments out
router.get('/my-payments-out', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const paymentsOut = await prisma.paymentOut.findMany({
      where: { csaId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(paymentsOut))
  } catch (error) {
    console.error('Failed to fetch payments out:', error)
    res.status(500).json({ error: 'Failed to fetch payments out' })
  }
})

router.post('/my-payments-out/create', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { amount, paymentMode, referenceNo, notes, supplierName } = req.body

    if (!amount || !paymentMode || !supplierName) {
      return res.status(400).json({ error: 'Amount, payment mode, and supplier name are required' })
    }

    const lastPayment = await prisma.paymentOut.findFirst({
      where: { csaId },
      orderBy: { createdAt: 'desc' }
    })
    let paymentNo = 'PO-001'
    if (lastPayment) {
      const lastNum = parseInt(lastPayment.paymentNo.split('-')[1]) || 0
      paymentNo = `PO-${String(lastNum + 1).padStart(3, '0')}`
    }

    const paymentOut = await prisma.paymentOut.create({
      data: {
        paymentNo,
        supplierName,
        csaId,
        amount,
        paymentMode,
        referenceNo,
        notes
      }
    })

    res.json(convertDecimals(paymentOut))
  } catch (error) {
    console.error('Failed to create payment out:', error)
    res.status(500).json({ error: 'Failed to create payment out' })
  }
})

// CSA's own dashboard statistics
router.get('/my-dashboard', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    const { startDate, endDate } = req.query
    
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

    const [
      totalSalesAgg,
      totalSalesReturnsAgg,
      totalPaymentsInAgg,
      totalPurchaseReturnsAgg,
      totalPaymentsOutAgg,
      partyCount,
      productCount,
      salesReturnCount,
      paymentInCount,
      purchaseReturnCount,
      paymentOutCount,
      invoiceCount
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { csaId, date: whereDateRange },
        _sum: { grandTotal: true }
      }),
      prisma.salesReturn.aggregate({
        where: { csaId, date: whereDateRange },
        _sum: { grandTotal: true }
      }),
      prisma.paymentIn.aggregate({
        where: { csaId, date: whereDateRange },
        _sum: { amount: true }
      }),
      prisma.purchaseReturn.aggregate({
        where: { csaId, date: whereDateRange },
        _sum: { grandTotal: true }
      }),
      prisma.paymentOut.aggregate({
        where: { csaId, date: whereDateRange },
        _sum: { amount: true }
      }),
      prisma.party.count({ where: { csaId } }),
      prisma.product.count({ where: { csaId } }),
      prisma.salesReturn.count({ where: { csaId, date: whereDateRange } }),
      prisma.paymentIn.count({ where: { csaId, date: whereDateRange } }),
      prisma.purchaseReturn.count({ where: { csaId, date: whereDateRange } }),
      prisma.paymentOut.count({ where: { csaId, date: whereDateRange } }),
      prisma.invoice.count({ where: { csaId, date: whereDateRange } })
    ])

    const totalSales = totalSalesAgg._sum.grandTotal || 0
    const totalSalesReturns = totalSalesReturnsAgg._sum.grandTotal || 0
    const totalRevenue = totalSales - totalSalesReturns
    const totalPaymentsReceived = totalPaymentsInAgg._sum.amount || 0
    const totalPurchaseReturns = totalPurchaseReturnsAgg._sum.grandTotal || 0
    const totalPaymentsOut = totalPaymentsOutAgg._sum.amount || 0

    res.json(convertDecimals({
      totalSales,
      totalSalesReturns,
      totalRevenue,
      totalPaymentsReceived,
      totalPurchaseReturns,
      totalPaymentsOut,
      partyCount,
      productCount,
      salesReturnCount,
      paymentInCount,
      purchaseReturnCount,
      paymentOutCount,
      invoiceCount
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// ==================== CSA REPORTS ENDPOINTS ====================

// CSA Distributor-wise Sales Report

module.exports = router
