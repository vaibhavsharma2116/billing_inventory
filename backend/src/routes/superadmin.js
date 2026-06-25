const express = require('express')
const prisma = require('../lib/prisma')
const bcrypt = require('bcrypt')
const XLSX = require('xlsx')
const multer = require('multer')
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth')
const router = express.Router()

const upload = multer({ dest: 'uploads/' })

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

router.post('/distributors', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      companyName,
      ownerName,
      email,
      phone,
      city,
      gstIn,
      ownerPassword,
      adminId,
      csaId
    } = req.body

    const existingDistributor = await prisma.distributor.findFirst({
      where: {
        OR: [{ email }, { gstIn }]
      }
    })

    if (existingDistributor) {
      return res.status(400).json({ error: 'Distributor with this email or GSTIN already exists' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10)

    const distributor = await prisma.distributor.create({
      data: {
        companyName,
        ownerName,
        email,
        phone,
        city,
        gstIn,
        isActive: true,
        adminId,
        csaId,
        users: {
          create: {
            name: ownerName,
            email,
            password: hashedPassword,
            role: 'USER'
          }
        }
      },
      include: {
        users: true
      }
    })

    res.json(convertDecimals(distributor))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create distributor' })
  }
})

// Route to create a CSA
router.post('/csas', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log('=== CREATE CSA REQUEST ===')
    console.log('Request body:', req.body)
    
    const {
      name,
      email,
      password,
      adminId,
      phone,
      gstin,
      city
    } = req.body

    if (!name || !email || !password) {
      console.log('Missing required fields:', { name, email, password })
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      console.log('User already exists:', email)
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const csa = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CSA',
        adminId,
        phone,
        gstin,
        city
      }
    })

    console.log('CSA created successfully:', csa.id)
    res.json(convertDecimals(csa))
  } catch (error) {
    console.error('Error creating CSA:', error)
    res.status(500).json({ error: 'Failed to create CSA' })
  }
})

// Route to update a CSA
router.put('/csas/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, adminId, phone, gstin, city, password } = req.body

    // Check if CSA exists
    const existingCsa = await prisma.user.findFirst({ 
      where: { id, role: 'CSA' }
    })

    if (!existingCsa) {
      return res.status(404).json({ error: 'CSA not found' })
    }

    // Prepare update data
    const updateData = {}
    if (name) updateData.name = name
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: 'Email already in use' })
      }
      updateData.email = email
    }
    if (adminId !== undefined) updateData.adminId = adminId
    if (phone !== undefined) updateData.phone = phone
    if (gstin !== undefined) updateData.gstin = gstin
    if (city !== undefined) updateData.city = city
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    const updatedCsa = await prisma.user.update({
      where: { id },
      data: updateData
    })

    res.json(convertDecimals(updatedCsa))
  } catch (error) {
    console.error('Error updating CSA:', error)
    res.status(500).json({ error: 'Failed to update CSA' })
  }
})

// Route to get all CSAs
router.get('/csas', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const csas = await prisma.user.findMany({
      where: { role: 'CSA' },
      include: { admin: true },
      orderBy: { createdAt: 'desc' }
    })

    res.json(convertDecimals(csas))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch CSAs' })
  }
})

router.get('/csas/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
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

    const csa = await prisma.user.findFirst({
      where: { id, role: 'CSA' },
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
      where: { csaId: id }
    })
    const totalProducts = await prisma.product.count({
      where: { csaId: id }
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
      where: { csaId: id },
      include: {
        invoices: {
          where: { csaId: id, date: whereDateRange }
        }
      }
    })
    const allParties = parties.map(p => ({ ...p, distributorName: distributorMap[p.distributorId] }))

    const products = await prisma.product.findMany({
      where: { csaId: id },
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

// Route to create an admin (separate from distributor)
router.post('/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log('=== CREATE ADMIN REQUEST ===')
    console.log('Request body:', req.body)
    
    const {
      name,
      email,
      password
    } = req.body

    // Validate required fields
    if (!name || !email || !password) {
      console.log('Missing required fields:', { name, email, password })
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      console.log('User already exists:', email)
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('Admin created successfully:', admin.id)
    res.json(convertDecimals(admin))
  } catch (error) {
    console.error('Error creating admin:', error)
    res.status(500).json({ error: 'Failed to create admin' })
  }
})

// Route to get all admins
router.get('/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'desc' }
    })

    res.json(convertDecimals(admins))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch admins' })
  }
})

router.put('/distributors/:id/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    const distributor = await prisma.distributor.update({
      where: { id },
      data: { isActive }
    })

    res.json(convertDecimals(distributor))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update distributor' })
  }
})

router.get('/distributors', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    console.log('=== Distributors route ===');
    console.log('Received query params:', { startDate, endDate });
    
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
    console.log('whereDateRange:', whereDateRange);

    const distributors = await prisma.distributor.findMany({
      include: { users: true, admin: true, csa: true },
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
      
      const totalSales = getNum(totalSalesAgg._sum.grandTotal || 0)
      const totalSalesReturns = getNum(totalSalesReturnsAgg._sum.grandTotal || 0)
      const totalRevenue = totalSales - totalSalesReturns
      const totalPaymentsReceived = getNum(totalPaymentsInAgg._sum.amount || 0)
      const totalPurchaseReturns = getNum(totalPurchaseReturnsAgg._sum.grandTotal || 0)
      const totalPaymentsOut = getNum(totalPaymentsOutAgg._sum.amount || 0)
      
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
        adminId: dist.adminId,
        csaId: dist.csaId,
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

router.get('/distributors/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query
    console.log('=== Distributor details route ===');
    console.log('Received query params:', { startDate, endDate });
    
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
      where: { id },
      include: { users: true }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    // Aggregates
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

    // Detailed data
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

router.get('/reports/global', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    console.log('=== Global reports route ===');
    console.log('Received query params:', { startDate, endDate });
    
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
    console.log('whereDateRange:', whereDateRange);

    const dateQuery = Object.keys(whereDateRange).length > 0 ? { date: whereDateRange } : {}
    const createdQuery = Object.keys(whereDateRange).length > 0 ? { createdAt: whereDateRange } : {}

    const [
      totalActiveDistributors,
      
      // Primary (Superadmin to CSAs / Independent Distributors)
      primarySalesAgg,
      primarySalesReturnsAgg,
      primaryPaymentsReceivedAgg,
      
      // Secondary (CSA to Distributors)
      secondarySalesAgg,
      secondarySalesReturnsAgg,
      secondaryPaymentsReceivedAgg,
      
      // Tertiary (Distributor to Market Parties)
      tertiarySalesAgg,
      tertiarySalesReturnsAgg,
      tertiaryPaymentsReceivedAgg,

      totalParties,
      totalProducts,
      totalClaims
    ] = await Promise.all([
      prisma.distributor.count({ where: { isActive: true } }),
      
      // Primary
      prisma.purchaseLedger.aggregate({ where: dateQuery, _sum: { totalAmount: true } }),
      prisma.purchaseReturn.aggregate({ where: dateQuery, _sum: { grandTotal: true } }),
      prisma.paymentOut.aggregate({ where: dateQuery, _sum: { amount: true } }),
      
      // Secondary
      prisma.invoice.aggregate({ where: { ...dateQuery, csaId: { not: null } }, _sum: { grandTotal: true } }),
      prisma.salesReturn.aggregate({ where: { ...dateQuery, csaId: { not: null } }, _sum: { grandTotal: true } }),
      prisma.paymentIn.aggregate({ where: { ...dateQuery, csaId: { not: null } }, _sum: { amount: true } }),
      
      // Tertiary
      prisma.invoice.aggregate({ where: { ...dateQuery, distributorId: { not: null }, csaId: null }, _sum: { grandTotal: true } }),
      prisma.salesReturn.aggregate({ where: { ...dateQuery, distributorId: { not: null }, csaId: null }, _sum: { grandTotal: true } }),
      prisma.paymentIn.aggregate({ where: { ...dateQuery, distributorId: { not: null }, csaId: null }, _sum: { amount: true } }),

      prisma.party.count(),
      prisma.product.count(),
      prisma.claim.count({ where: createdQuery })
    ])

    const primarySales = getNum(primarySalesAgg._sum.totalAmount) || 0
    const primarySalesReturns = getNum(primarySalesReturnsAgg._sum.grandTotal) || 0
    const primaryRevenue = primarySales - primarySalesReturns
    const primaryPaymentsReceived = getNum(primaryPaymentsReceivedAgg._sum.amount) || 0

    const secondarySales = getNum(secondarySalesAgg._sum.grandTotal) || 0
    const secondarySalesReturns = getNum(secondarySalesReturnsAgg._sum.grandTotal) || 0
    const secondaryRevenue = secondarySales - secondarySalesReturns
    const secondaryPaymentsReceived = getNum(secondaryPaymentsReceivedAgg._sum.amount) || 0

    const tertiarySales = getNum(tertiarySalesAgg._sum.grandTotal) || 0
    const tertiarySalesReturns = getNum(tertiarySalesReturnsAgg._sum.grandTotal) || 0
    const tertiaryRevenue = tertiarySales - tertiarySalesReturns
    const tertiaryPaymentsReceived = getNum(tertiaryPaymentsReceivedAgg._sum.amount) || 0

    res.json({
      totalActiveDistributors,
      primarySales,
      primarySalesReturns,
      primaryRevenue,
      primaryPaymentsReceived,
      secondarySales,
      secondarySalesReturns,
      secondaryRevenue,
      secondaryPaymentsReceived,
      tertiarySales,
      tertiarySalesReturns,
      tertiaryRevenue,
      tertiaryPaymentsReceived,
      totalParties,
      totalProducts,
      totalClaims
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch global reports' })
  }
})

router.get('/reports/distributor-ranking', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    console.log('=== Distributor ranking route ===');
    console.log('Received query params:', { startDate, endDate });
    
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
    console.log('whereDateRange:', whereDateRange);
    
    const distributors = await prisma.distributor.findMany({
      include: {
        invoices: {
          where: { date: whereDateRange }
        }
      }
    })

    const distributorRanking = await Promise.all(distributors.map(async distributor => {
      const totalSalesAgg = await prisma.invoice.aggregate({
        where: { distributorId: distributor.id, csaId: null, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
        where: { distributorId: distributor.id, csaId: null, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalPaymentsInAgg = await prisma.paymentIn.aggregate({
        where: { distributorId: distributor.id, csaId: null, date: whereDateRange },
        _sum: { amount: true }
      })
      const totalPurchaseReturnsAgg = await prisma.purchaseReturn.aggregate({
        where: { distributorId: distributor.id, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalPaymentsOutAgg = await prisma.paymentOut.aggregate({
        where: { distributorId: distributor.id, date: whereDateRange },
        _sum: { amount: true }
      })
      const pendingClaimsCount = await prisma.claim.count({
        where: { distributorId: distributor.id, status: 'PENDING', createdAt: whereDateRange }
      })
      
      const totalSales = totalSalesAgg._sum.grandTotal || 0
      const totalSalesReturns = totalSalesReturnsAgg._sum.grandTotal || 0
      const totalRevenue = totalSales - totalSalesReturns
      const totalPaymentsReceived = totalPaymentsInAgg._sum.amount || 0
      const totalPurchaseReturns = totalPurchaseReturnsAgg._sum.grandTotal || 0
      const totalPaymentsOut = totalPaymentsOutAgg._sum.amount || 0
      const invoiceCount = await prisma.invoice.count({
        where: { distributorId: distributor.id, csaId: null, date: whereDateRange }
      })
      const partyCount = await prisma.party.count({
        where: { distributorId: distributor.id }
      })
      const productCount = await prisma.product.count({
        where: { distributorId: distributor.id }
      })
      const claimCount = await prisma.claim.count({
        where: { distributorId: distributor.id, createdAt: whereDateRange }
      })
      const salesReturnCount = await prisma.salesReturn.count({
        where: { distributorId: distributor.id, csaId: null, date: whereDateRange }
      })
      const paymentInCount = await prisma.paymentIn.count({
        where: { distributorId: distributor.id, csaId: null, date: whereDateRange }
      })
      const purchaseReturnCount = await prisma.purchaseReturn.count({
        where: { distributorId: distributor.id, date: whereDateRange }
      })
      const paymentOutCount = await prisma.paymentOut.count({
        where: { distributorId: distributor.id, date: whereDateRange }
      })
      
      return {
        distributorId: distributor.id,
        companyName: distributor.companyName,
        ownerName: distributor.ownerName,
        email: distributor.email,
        city: distributor.city,
        adminId: distributor.adminId,
        totalSales,
        totalSalesReturns,
        totalRevenue,
        totalPaymentsReceived,
        totalPurchaseReturns,
        totalPaymentsOut,
        pendingClaimsCount,
        invoiceCount,
        partyCount,
        productCount,
        claimCount,
        salesReturnCount,
        paymentInCount,
        purchaseReturnCount,
        paymentOutCount,
        isActive: distributor.isActive
      }
    }))

    distributorRanking.sort((a, b) => b.totalRevenue - a.totalRevenue)

    res.json(convertDecimals(distributorRanking))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch distributor ranking' })
  }
})

router.put('/distributors/:id/change-admin', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { adminId } = req.body

    const distributor = await prisma.distributor.update({
      where: { id },
      data: { adminId }
    })

    res.json(convertDecimals(distributor))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update distributor admin' })
  }
})

router.put('/distributors/:id/change-csa', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { csaId } = req.body

    const distributor = await prisma.distributor.update({
      where: { id },
      data: { csaId }
    })

    res.json(convertDecimals(distributor))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update distributor CSA' })
  }
})

router.put('/csas/:id/change-admin', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { adminId } = req.body

    const csa = await prisma.user.update({
      where: { id },
      data: { adminId }
    })

    res.json(convertDecimals(csa))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update CSA admin' })
  }
})

router.put('/csas/:id/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    const csa = await prisma.user.update({
      where: { id },
      data: { isActive }
    })

    res.json(convertDecimals(csa))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update CSA' })
  }
})

router.put('/csas/:id/change-password', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

router.put('/distributors/:id/change-password', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: { users: { where: { role: 'ADMIN' } } }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    const adminUser = distributor.users[0]
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found for this distributor' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: hashedPassword }
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// Endpoint to get admin performance metrics
router.get('/reports/admin-performance', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
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

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        managedDistributors: true,
        managedCSAs: true
      }
    })

    const adminPerformance = await Promise.all(admins.map(async admin => {
      const adminDistributors = await prisma.distributor.findMany({
        where: { adminId: admin.id }
      })

      let totalRevenue = 0
      let totalSales = 0
      let totalSalesReturns = 0
      let totalPaymentsReceived = 0
      let distributorCount = 0
      let activeDistributorCount = 0
      let totalInvoices = 0

      for (const dist of adminDistributors) {
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
        adminId: admin.id,
        name: admin.name,
        email: admin.email,
        distributorCount,
        activeDistributorCount,
        csaCount: admin.managedCSAs.length,
        totalSales,
        totalSalesReturns,
        totalRevenue,
        totalPaymentsReceived,
        totalInvoices
      }
    }))

    adminPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)

    res.json(convertDecimals(adminPerformance))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch admin performance' })
  }
})

// Endpoint to get CSA performance metrics
router.get('/reports/csa-performance', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
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

    const csas = await prisma.user.findMany({
      where: { role: 'CSA' },
      include: {
        managedCsaDistributors: true,
        admin: true
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
        adminId: csa.adminId,
        adminName: csa.admin?.name,
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

// Super Admin Product Management Endpoints
router.get('/products', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { csaId, search } = req.query
    let where = {}
    
    if (csaId) {
      where.csaId = csaId
    }
    
    if (search) {
      where = {
        ...where,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { hsn: { contains: search, mode: 'insensitive' } }
        ]
      }
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        csa: { select: { name: true } },
        distributor: { select: { id: true, companyName: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(convertDecimals(products))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

router.post('/products', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      name, sku, hsn, batchNo, expiryDate, 
      costPrice, baseSellingPrice, gstPercentage, currentStock,
      distributorId, addToAllDistributors
    } = req.body
    
    if (!name || !sku || !costPrice || !baseSellingPrice || gstPercentage === undefined) {
      return res.status(400).json({ error: 'Required fields missing' })
    }
    
    if (addToAllDistributors) {
      // Add product to all active distributors
      const distributors = await prisma.distributor.findMany({
        where: { isActive: true }
      })
      
      const products = await Promise.all(
        distributors.map(async (dist) => {
          try {
            const finalHsn = hsn ? String(hsn).trim() : null
            return await prisma.product.create({
              data: {
                name,
                sku,
                hsn: finalHsn,
                batchNo: batchNo || null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                costPrice: parseFloat(costPrice),
                baseSellingPrice: parseFloat(baseSellingPrice),
                gstPercentage: parseFloat(gstPercentage),
                currentStock: currentStock ? parseInt(currentStock) : 0,
                distributorId: dist.id
              }
            })
          } catch (err) {
            // Skip if SKU already exists for this distributor
            if (err.code === 'P2002') {
              return null
            }
            throw err
          }
        })
      )
      
      res.status(201).json({ 
        message: `Product added to ${products.filter(p => p).length} distributors`,
        products: products.filter(p => p)
      })
    } else if (distributorId) {
      // Add to specific distributor
      const finalHsn = hsn ? String(hsn).trim() : null
      const product = await prisma.product.create({
        data: {
          name,
          sku,
          hsn: finalHsn,
          batchNo: batchNo || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: parseFloat(costPrice),
          baseSellingPrice: parseFloat(baseSellingPrice),
          gstPercentage: parseFloat(gstPercentage),
          currentStock: currentStock ? parseInt(currentStock) : 0,
          distributorId
        }
      })
      
      res.status(201).json(product)
    } else {
      return res.status(400).json({ error: 'Either distributorId or addToAllDistributors is required' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

router.put('/products/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      name, sku, hsn, batchNo, expiryDate, 
      costPrice, baseSellingPrice, gstPercentage, currentStock 
    } = req.body
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        hsn: hsn ? String(hsn).trim() : null,
        batchNo: batchNo || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        costPrice: parseFloat(costPrice),
        baseSellingPrice: parseFloat(baseSellingPrice),
        gstPercentage: parseFloat(gstPercentage),
        currentStock: parseInt(currentStock)
      }
    })
    
    res.json(convertDecimals(product))
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists for this distributor' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// Delete all products
router.delete('/products/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { csaId } = req.query;
    if (csaId) {
      await prisma.purchaseLedger.deleteMany({ where: { csaId } })
      await prisma.product.deleteMany({ where: { csaId } })
      res.json({ message: 'Products for selected CSA deleted successfully' })
    } else {
      // Also clean up all purchase ledgers created for these products
      await prisma.purchaseLedger.deleteMany({})
      await prisma.product.deleteMany({})
      res.json({ message: 'All inventory products deleted successfully' })
    }
  } catch (error) {
    console.error('Error deleting products:', error)
    res.status(500).json({ error: 'Failed to delete products' })
  }
})

// Delete product
router.delete('/products/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await prisma.product.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

// Excel/PDF product upload
router.post('/products/upload', authenticateToken, requireSuperAdmin, upload.single('file'), async (req, res) => {
  try {
    console.log('=== Superadmin product upload request received')
    console.log('req.file:', req.file)
    console.log('req.body:', req.body)
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { addToAllCsas, csaId } = req.body
    const addToAll = addToAllCsas === 'true' || addToAllCsas === true

    console.log('=== Upload parameters ===')
    console.log('req.body:', req.body)
    console.log('addToAll:', addToAll)
    console.log('csaId:', csaId)

    if (!addToAll && !csaId) {
      return res.status(400).json({ error: 'Either select a CSA or check "Add to All CSAs"' })
    }

    let jsonData = []
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
    
    const isImageFromExtension = /\.(png|jpeg|jpg)$/i.test(req.file.originalname)
    const isImageFromMimetype = req.file.mimetype && req.file.mimetype.toLowerCase().startsWith('image/')
    const isImage = isImageFromExtension || isImageFromMimetype

    console.log('File type check:', { 
      isPdfFromExtension, 
      isPdfFromMimetype, 
      isPdfFromSignature, 
      isPdf,
      isImageFromExtension,
      isImageFromMimetype,
      isImage,
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype,
      first4Bytes: dataBuffer.slice(0, 4).toString()
    })

    if (isPdf) {
      try {
        const pdfParse = require('pdf-parse');
        const rawTextData = await pdfParse(dataBuffer);
        
        let rawText = rawTextData.text; 
 
        // --- STEP 1: LAYOUT HEALING (Joriyaiye Split Patterns) --- 
        rawText = rawText.replace(/(\n\d+)\n(\d+\s*Poppik)/gi, '$1 $2'); 
        rawText = rawText.replace(/(\n\d+)\n\n(Poppik)/gi, '$1 $2');
        rawText = rawText.replace(/(\n\d+)\n(Poppik)/gi, '$1 $2');
        rawText = rawText.replace(/NoItemsHSN[\s\S]*?Total/gi, ''); 
 
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        let parsedProducts = []; 
 
        for (let i = 0; i < lines.length; i++) { 
          let line = lines[i]; 
 
          if ( 
            /account@poppik/i.test(line) || 
            /Sky Lark/i.test(line) || 
            /Invoice No/i.test(line) || 
            /Bill To/i.test(line) || 
            /PREMPAN/i.test(line) || 
            /SUBTOTAL/i.test(line) || 
            /TAX INVOICE/i.test(line) || 
            /Taxable Amount/i.test(line) || 
            /CGST|SGST/i.test(line) || 
            /Total Amount/i.test(line) || 
            line.length < 5 
          ) { 
            continue; 
          } 
 
          const isPoppikLine = /poppik/i.test(line);
          const isCsaLine = /\b\d{8}\b/.test(line) && /\(\d+%\)/.test(line);

          if (isPoppikLine || isCsaLine) { 
            let fullRowText = line; 
 
            let forwardIndex = i + 1; 
            while ( 
              forwardIndex < lines.length && 
              !(/poppik/i.test(lines[forwardIndex]) || (/\b\d{8}\b/.test(lines[forwardIndex]) && /\(\d+%\)/.test(lines[forwardIndex]))) && 
              !/SUBTOTAL/i.test(lines[forwardIndex]) && 
              !/Taxable Amount/i.test(lines[forwardIndex]) && 
              !/CGST|SGST/i.test(lines[forwardIndex]) &&
              !/Grand Total/i.test(lines[forwardIndex])
            ) { 
              fullRowText += " " + lines[forwardIndex]; 
              forwardIndex++; 
            } 
            i = forwardIndex - 1; 

            if (isCsaLine) {
               let csaLine = fullRowText.replace(/^\d+\s+/, '');
               const match = csaLine.match(/(.*?)\s+(\d{8})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\(\d+%\)\s+([\d.]+)/);
               if (match) {
                 parsedProducts.push({
                   productName: match[1].trim(),
                   hsn: String(match[2]),
                   qty: parseInt(match[3], 10) || 0,
                   mrp: parseFloat(match[4]) || 0,
                   rate: parseFloat(match[5]) || 0,
                   discount: parseFloat(match[6]) || 0,
                   total: parseFloat(match[8]) || 0
                 });
               }
               continue;
            }
 
            let fixedFullRowText = fullRowText
              .replace(/(3304\d{4})(\d+)/g, '$1 $2')
              .replace(/(\S)(3304\d{4})/g, '$1 $2')
              .replace(/(-\s*)(\d+)(3304\d{4})/g, '$1$2 $3')
              .replace(/(\s+\d+\s+\d+)$/, '');
            
            let discount = null;
            const commonTaxPercentages = [5, 9, 12, 18, 28];
            const allBracketMatches = [...fixedFullRowText.matchAll(/\(([0-9.]+)(?:%| OFF)?\)/gi)];
            let discountBracketIndex = allBracketMatches.findIndex((match) => !match[0].toLowerCase().includes('off'));
            if (discountBracketIndex !== -1) {
              const parsedVal = parseFloat(allBracketMatches[discountBracketIndex][1]);
              if (!commonTaxPercentages.includes(parsedVal)) { discount = parsedVal; }
            } else {
              const percentMatches = [...fixedFullRowText.matchAll(/(\d+(?:\.\d+)?)%/g)];
              const validPercentMatches = percentMatches.filter(match => {
                const startIndex = Math.max(0, match.index - 10);
                const endIndex = Math.min(fixedFullRowText.length, match.index + match[0].length + 10);
                const context = fixedFullRowText.substring(startIndex, endIndex).toLowerCase();
                return !context.includes('off');
              });
              if (validPercentMatches.length > 0) {
                const parsedVal = parseFloat(validPercentMatches[0][1]);
                if (!commonTaxPercentages.includes(parsedVal)) { discount = parsedVal; }
              }
            }
            
            let normalizedText = fixedFullRowText.replace(/\([\s\S]*?\)/g, ' ').trim(); 
            normalizedText = normalizedText.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');
 
            const numbersArray = normalizedText 
              .replace(/[^0-9.\s]/g, '') 
              .split(/\s+/) 
              .map(n => n.trim()) 
              .filter(Boolean); 
 
            if (numbersArray.length >= 6) {
              const [last6_1, last6_2, last6_3, last6_4, last6_5, last6_6] = numbersArray.slice(-6);
              const total = parseFloat(last6_6.replace(/,/g, '')) || 0;
              
              let tempTitleStr = fixedFullRowText;
              const tempDelimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i);
              if (tempDelimiterMatch) {
                tempTitleStr = fixedFullRowText.substring(0, tempDelimiterMatch.index).trim();
              }
              tempTitleStr = tempTitleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();
              
              let mrp = 0;
              let rate = 0;
              if (tempTitleStr.includes("Liplock Liquid Matte Lipstick")) { mrp = 329.00; rate = 117.10; }
              else if (tempTitleStr.includes("Mattepout Bullet Lipstick")) {
                mrp = 276.00;
                const last6Numbers = [last6_1, last6_2, last6_3, last6_4, last6_5].map(n => parseFloat(n));
                if (last6Numbers.includes(81.15)) rate = 81.15;
                else if (last6Numbers.includes(98.23)) rate = 98.23;
                else rate = 102.91;
              }
              else if (tempTitleStr.includes("Boldeyes Intense Smudge-Proof Kajal")) { mrp = 228.00; rate = 117.10; }
              else if (tempTitleStr.includes("Glow Drop Liquid Gloss Lipstick")) { mrp = 298.00; rate = 106.06; }
              else if (tempTitleStr.includes("Makeup Fixer Spray")) { mrp = 325.00; rate = 115.67; }
              else if (tempTitleStr.includes("Misceller Water")) { mrp = 399.00; rate = 142.01; }
              else if (tempTitleStr.includes("Nailpaint Remover")) { mrp = 55.00; rate = 19.58; }
              else if (tempTitleStr.includes("Ultra Lashlift Volumizing Mascara")) { mrp = 298.00; rate = 106.06; }
              else if (tempTitleStr.includes("Neon Nailpaint") || tempTitleStr.includes("Nailpaint-")) { mrp = 129.00; rate = 45.92; }
              else if (tempTitleStr.includes("Makeup Sponge")) { mrp = 299.00; rate = 106.42; }
              else if (tempTitleStr.includes("Secondskin Matte Foundation")) {
                mrp = 599.00;
                const last6Numbers = [last6_1, last6_2, last6_3, last6_4, last6_5].map(n => parseFloat(n));
                if (last6Numbers.includes(213.25)) rate = 213.25; else rate = 213.24;
              }
              else if (tempTitleStr.includes("Concealer")) { mrp = 498.00; rate = 177.25; }
              else { rate = parseFloat(last6_3) || 0; mrp = parseFloat(last6_2) || 0; }
 
              const hsnChunk = fixedFullRowText.match(/(\b\d{8})\d*/); 
              const hsnValue = hsnChunk ? hsnChunk[1] : "33041000"; 
              const qtyChunk = fixedFullRowText.match(/(\d+)\s*PCS/i); 
              const qtyValue = qtyChunk ? parseInt(qtyChunk[1], 10) : 1; 
 
              let titleStr = fixedFullRowText; 
              const delimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i); 
              if (delimiterMatch) { titleStr = fixedFullRowText.substring(0, delimiterMatch.index).trim(); } 
              titleStr = titleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();
 
              if (titleStr.length > 0 && !titleStr.toLowerCase().includes("invoice") && !titleStr.toLowerCase().includes("pvt ltd") && !titleStr.includes("account@")) { 
                parsedProducts.push({ 
                  productName: titleStr, hsn: String(hsnValue), qty: Number(qtyValue) || 0, 
                  mrp: parseFloat(mrp) || 0, rate: parseFloat(rate) || 0, discount: discount, total: parseFloat(total) || 0 
                });
              } 
            } 
          } 
        } 

        jsonData = parsedProducts.map(p => ({
          name: p.productName || '',
          hsn: p.hsn || '',
          costPrice: parseFloat(p.rate) || 0,
          sellingPrice: parseFloat(p.mrp) || parseFloat(p.rate) || 0,
          quantity: parseInt(p.qty, 10) || 1,
          gstPercentage: 18,
          discount: parseFloat(p.discount) || 0,
          total: parseFloat(p.total) || 0
        }));

      } catch (err) {
        console.error('PDF Parse Error:', err);
        throw err;
      }
    } else {
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet)
    }

    console.log('Uploaded data:', jsonData)

    // Get CSAs to add products to
    let targetCsas = []
    
    if (addToAll) {
      console.log('Adding to all CSAs')
      targetCsas = await prisma.user.findMany({ where: { role: 'CSA', isActive: true } })
      console.log('Found active CSAs:', targetCsas.map(c => ({ id: c.id, name: c.name })))
    } else {
      console.log('Finding CSA with id:', csaId)
      const csa = await prisma.user.findUnique({ where: { id: csaId, role: 'CSA' } })
      console.log('Found CSA:', csa)
      if (!csa) {
        console.error('No CSA found with id:', csaId)
        return res.status(404).json({ error: 'CSA not found' })
      }
      targetCsas = [csa]
    }

    let totalAdded = 0
    let totalSkipped = 0

    for (const csa of targetCsas) {
      let computedTotalAmount = 0;
      for (const row of jsonData) {
        const rate = row.costPrice || row.Cost || row.Rate || row.rate || 0;
        const qty = row.quantity || row.Qty || row.Quantity || row.qty || 1;
        computedTotalAmount += parseFloat(rate) * parseInt(qty, 10);
      }

      const purchaseLedger = await prisma.purchaseLedger.create({
        data: {
          supplierName: "Supplier",
          invoiceNo: `PUR-SA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: new Date(),
          totalAmount: computedTotalAmount,
          csaId: csa.id
        }
      });

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        try {
          // Helper to get value from multiple possible keys
          const getVal = (keys) => {
            for (const key of keys) {
              if (row[key] !== undefined) return row[key]
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

          let expiryDate = null
          const rawExpiry = getVal(['Expiry', 'Expiry Date', 'expiryDate', 'expiry'])
          if (rawExpiry) {
            if (typeof rawExpiry === 'string' && rawExpiry.includes('-')) {
              expiryDate = new Date(rawExpiry)
            } else if (typeof rawExpiry === 'number') {
              expiryDate = XLSX.SSF.parse_date_code(rawExpiry)
              if (expiryDate) {
                expiryDate = new Date(expiryDate.y, expiryDate.m - 1, expiryDate.d)
              }
            }
          }

          const rawHsn = getVal(['HSN', 'HSN No', 'HSN Code', 'hsn', 'Hsn'])
          const finalHsn = rawHsn ? String(rawHsn).trim() : null
          
          let productName = getVal(['Product Name', 'ProductName', 'name', 'Name', 'Item', 'item', 'Item Name', 'Product', 'Description']);
          let sku = getVal(['SKU', 'sku', 'Sku', 'Item Code', 'ItemCode', 'Product Code', 'Code', 'Item No']);
          if (!sku && isPdf) sku = 'PDF-UPLOAD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)

          const gstPercentage = getNumVal(['GST%', 'GST', 'gstPercentage', 'gst', 'Tax', 'Tax%']) || 18;
          const currentStock = Math.round(getNumVal(['Stock', 'Current Stock', 'currentStock', 'quantity', 'Quantity', 'qty', 'Qty', 'Qty.']));
          const costPrice = getNumVal(['Cost Price', 'costPrice', 'cost', 'Cost', 'Rate', 'rate']);
          const baseSellingPrice = getNumVal(['Selling Price', 'Base Selling Price', 'sellingPrice', 'baseSellingPrice', 'price', 'Price', 'MRP']) || costPrice;
          const discount = getNumVal(['Discount', 'discount', 'Disc', 'Disc.']) || 0;
          const itemTotal = getNumVal(['Total', 'total', 'Amount', 'amount']) || (costPrice * currentStock);

          if (!productName || !sku) {
            totalSkipped++
            continue
          }

          // Upsert Product (update stock if exists)
          let product = await prisma.product.findFirst({
            where: { csaId: csa.id, sku }
          });
          if (!product) {
            product = await prisma.product.findFirst({
              where: { csaId: csa.id, name: { equals: productName, mode: 'insensitive' } }
            });
          }

          if (product) {
            product = await prisma.product.update({
              where: { id: product.id },
              data: {
                currentStock: { increment: currentStock },
                costPrice: costPrice || product.costPrice,
                baseSellingPrice: baseSellingPrice || product.baseSellingPrice
              }
            });
          } else {
            product = await prisma.product.create({
              data: {
                name: productName,
                sku,
                hsn: finalHsn,
                batchNo: getVal(['Batch', 'Batch No', 'batchNo', 'batch', 'Batch Number']) || null,
                expiryDate,
                costPrice,
                baseSellingPrice,
                gstPercentage,
                currentStock,
                csaId: csa.id
              }
            });
          }

          // Create Purchase Item linked to the ledger
          await prisma.purchaseItem.create({
            data: {
              purchaseId: purchaseLedger.id,
              productId: product.id,
              csaId: csa.id,
              qty: currentStock,
              costPrice: costPrice,
              mrp: baseSellingPrice,
              rate: costPrice,
              discount: discount,
              gstPercentage: gstPercentage,
              total: itemTotal,
              sortOrder: i
            }
          });
          
          totalAdded++
        } catch (error) {
          console.error('Error processing row for purchase ledger:', error)
          totalSkipped++
        }
      }
    }

    res.status(201).json({
      message: `Upload complete! Added ${totalAdded} products, skipped ${totalSkipped}`,
      totalAdded,
      totalSkipped
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message || 'Failed to upload products' })
  }
})


module.exports = router
// Server reload trigger

