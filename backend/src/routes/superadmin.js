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

    const totalActiveDistributors = await prisma.distributor.count({
      where: { isActive: true }
    })

    const allInvoices = await prisma.invoice.findMany({
      where: { date: whereDateRange }
    })
    const totalSales = allInvoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)

    const totalClaims = await prisma.claim.count({
      where: { createdAt: whereDateRange }
    })

    res.json({
      totalActiveDistributors,
      totalSales,
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
    const { distributorId, search } = req.query
    let where = {}
    
    if (distributorId) {
      where.distributorId = distributorId
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
      include: { distributor: { select: { id: true, companyName: true } } },
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

    const { addToAllDistributors, distributorId } = req.body
    const addToAll = addToAllDistributors === 'true' || addToAllDistributors === true

    console.log('=== Upload parameters ===')
    console.log('req.body:', req.body)
    console.log('addToAll:', addToAll, 'distributorId:', distributorId, 'distributorId type:', typeof distributorId)

    if (!addToAll && !distributorId) {
      return res.status(400).json({ error: 'Either select a distributor or check "Add to All Distributors"' })
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
    
    if (isPdf) {
      const pdfParse = require('pdf-parse')
      let data;
      
      try {
        data = await pdfParse(dataBuffer)
        console.log('Full PDF text:', data.text.substring(0, 3000))
        
        const lines = data.text.split(/\r?\n/).filter(line => line.trim())
        console.log('All lines:', lines)
        
        let headerRowIndex = -1
        const headerPatterns = [
          ['no', 'items', 'hsn', 'qty'],
          ['item', 'product', 'hsn', 'quantity'],
          ['sl', 'description', 'hsn', 'qty'],
          ['serial', 'product', 'hsn', 'rate'],
          ['no', 'items', 'hsn', 'mrp', 'rate'],
          ['no', 'items', 'hsn no', 'qty'],
          ['no', 'items', 'hsn no.', 'qty'],
          ['no', 'items', 'hsn', 'mrp', 'rate', 'tax']
        ]
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase()
          for (const pattern of headerPatterns) {
            const matches = pattern.filter(keyword => line.includes(keyword)).length
            if (matches >= 2) { // Reduced required matches to find more headers
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
              break // Stop at total/subtotal
            }

            // Check if line starts with a number followed by non-number (serial number)
            const serialMatch = line.match(/^(\d+)([^\d].*)$/)
            if (serialMatch) {
              const serialNum = parseInt(serialMatch[1])
              let productLine = serialMatch[2] // Rest after serial number
              let allProductText = productLine
              let allNumbers = []

              // Helper function to extract numbers correctly
              const extractNumbers = (text) => {
                // First, handle cases like "115.6721,653.33" - split after decimal with 2 digits
                let processed = text.replace(/(\.\d{2})(\d)/g, '$1 $2')
                // Also split combined HSN and quantity: look for 8-digit number followed by more digits!
                processed = processed.replace(/(\d{8})(\d+)/g, '$1 $2')
                const matches = processed.match(/\d+(?:,\d+)*(?:\.\d+)?/g)
                return matches || []
              }

              // Extract numbers from main product line
              const mainNums = extractNumbers(productLine)
              if (mainNums) allNumbers.push(...mainNums)

              // Collect lines until next product or total
              i++
              while (i < lines.length) {
                const nextLine = lines[i].trim()
                const isNextProduct = /^\d+[^\d]/.test(nextLine)
                const isTotalLine = nextLine.toLowerCase().includes('total') || 
                                   nextLine.toLowerCase().includes('subtotal')
                if (isNextProduct || isTotalLine) {
                  break
                }
                allProductText += ' ' + nextLine
                // Extract numbers from this line
                const nextNums = extractNumbers(nextLine)
                if (nextNums) allNumbers.push(...nextNums)
                i++
              }

              // Now parse this product
              let productName = ''
              let hsn = ''
              let quantity = 1
              let costPrice = 0
              let sellingPrice = 0

              // Parse all numbers
              const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n))
              console.log('All collected numbers:', nums)

              // Find HSN: exactly 8 digits as per PDF
              let hsnIndex = -1
              for (let j = 0; j < nums.length; j++) {
                const numStr = nums[j].toString()
                if (Number.isInteger(nums[j]) && numStr.length === 8) {
                  hsn = numStr
                  hsnIndex = j
                  break
                }
              }

              // Find Quantity: look for PCS, exclude HSN first
              let textForQty = allProductText
              if (hsn) {
                textForQty = textForQty.replace(hsn, '')
              }
              const qtyMatch = textForQty.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i)
              if (qtyMatch) {
                quantity = parseInt(qtyMatch[1])
              } else {
                // If no qty match, find the number right after HSN!
                if (hsnIndex !== -1 && hsnIndex + 1 < nums.length) {
                  const candidateQty = nums[hsnIndex + 1]
                  if (Number.isInteger(candidateQty) && candidateQty > 0 && candidateQty < 10000) {
                    quantity = candidateQty
                  }
                }
              }

              // Find price candidates, exclude tax/discount percentages and big totals
              const priceCandidates = nums.filter((n, j) => 
                j !== hsnIndex && 
                n > 0 && 
                n !== quantity && 
                n < 100000 &&
                n !== 18 && // exclude common tax percentage (GST)
                Math.abs(n - 64.41) > 0.1 && // exclude common discount percentage
                n < 5000 && // exclude big totals like 21653.33
                n !== 0
              )
              console.log('Filtered price candidates:', priceCandidates)
              
              if (priceCandidates.length >= 2) {
                priceCandidates.sort((a, b) => a - b)
                // The smallest should be Rate (costPrice), largest should be MRP (sellingPrice)
                costPrice = priceCandidates[0]
                sellingPrice = priceCandidates[priceCandidates.length - 1]
              } else if (priceCandidates.length === 1) {
                costPrice = priceCandidates[0]
                sellingPrice = costPrice * 1.2
              }

              // Extract product name
              productName = allProductText
                .replace(/[\d,₹$€%\-.()@]/g, ' ')
                .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF|%)/gi, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim()

              console.log('Parsed product:', { productName, hsn, quantity, costPrice, sellingPrice })

              if (productName.length > 2 && quantity > 0) {
                jsonData.push({
                  'name': productName,
                  'sku': '',
                  'hsn': hsn,
                  'cost': costPrice,
                  'price': sellingPrice,
                  'gst': 0,
                  'quantity': quantity
                })
              }
            } else {
              i++
            }
          }
        }
        
        // No fallback approach to avoid parsing random lines as products
        
        console.log('Final items extracted from PDF:', jsonData)
        
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr)
        jsonData = [{ 'pdfError': pdfErr.message, 'stack': pdfErr.stack, 'text': data ? data.text.substring(0, 1000) : '' }]
      }
    } else {
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet)
    }

    console.log('Uploaded data:', jsonData)

    // Get distributors to add products to
    let targetDistributors = []
    const allDistributors = await prisma.distributor.findMany()
    console.log('=== All distributors in database ===', allDistributors.map(d => ({ id: d.id, name: d.companyName, isActive: d.isActive })))
    
    if (addToAll) {
      console.log('Adding to all distributors')
      targetDistributors = await prisma.distributor.findMany({ where: { isActive: true } })
      console.log('Found active distributors:', targetDistributors.map(d => ({ id: d.id, name: d.companyName })))
    } else {
      console.log('Finding distributor with id:', distributorId)
      const distributor = await prisma.distributor.findUnique({ where: { id: distributorId } })
      console.log('Found distributor:', distributor)
      if (!distributor) {
        console.error('No distributor found with id:', distributorId)
        return res.status(404).json({ error: 'Distributor not found' })
      }
      targetDistributors = [distributor]
    }

    let totalAdded = 0
    let totalSkipped = 0

    for (const distributor of targetDistributors) {
      for (const row of jsonData) {
        try {
          // Helper to get value from multiple possible keys
          const getVal = (keys) => {
            for (const key of keys) {
              if (row[key] !== undefined) {
                return row[key]
              }
            }
            return ''
          }

          // Helper to get numeric value
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

          // Map columns to product fields
          let expiryDate = null
          const rawExpiry = getVal(['Expiry', 'Expiry Date', 'expiryDate', 'expiry'])
          if (rawExpiry) {
            if (typeof rawExpiry === 'string' && rawExpiry.includes('-')) {
              // If it's already an ISO-like date string (YYYY-MM-DD)
              expiryDate = new Date(rawExpiry)
            } else if (typeof rawExpiry === 'number') {
              // If it's an Excel serial number
              expiryDate = XLSX.SSF.parse_date_code(rawExpiry)
              if (expiryDate) {
                expiryDate = new Date(expiryDate.y, expiryDate.m - 1, expiryDate.d)
              }
            }
          }

          const rawHsn = getVal(['HSN', 'HSN No', 'HSN Code', 'hsn', 'Hsn'])
          const finalHsn = rawHsn ? String(rawHsn).trim() : null
          
          const productData = {
            name: getVal(['Product Name', 'ProductName', 'name', 'Name', 'Item', 'item', 'Item Name', 'Product', 'Description']),
            sku: getVal(['SKU', 'sku', 'Sku', 'Item Code', 'ItemCode', 'Product Code', 'Code', 'Item No']),
            hsn: finalHsn,
            batchNo: getVal(['Batch', 'Batch No', 'batchNo', 'batch', 'Batch Number']),
            expiryDate,
            costPrice: getNumVal(['Cost Price', 'costPrice', 'cost', 'Cost', 'Rate', 'rate']),
            baseSellingPrice: getNumVal(['Selling Price', 'Base Selling Price', 'sellingPrice', 'baseSellingPrice', 'price', 'Price', 'MRP']),
            gstPercentage: getNumVal(['GST%', 'GST', 'gstPercentage', 'gst', 'Tax', 'Tax%']),
            currentStock: Math.round(getNumVal(['Stock', 'Current Stock', 'currentStock', 'quantity', 'Quantity', 'qty', 'Qty', 'Qty.'])),
            distributorId: distributor.id
          }

          console.log('=== Creating product ===')
          console.log('Product data:', productData)
          console.log('HSN value:', finalHsn, 'HSN type:', typeof finalHsn)
          console.log('All fields types:', Object.entries(productData).map(([k,v]) => `${k}: ${typeof v}`))

          // If SKU is missing and this is from a PDF, generate a temporary one
          if (!productData.sku && isPdf) {
            productData.sku = 'PDF-UPLOAD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
          }
          
          // Validate required fields
          if (!productData.name || !productData.sku || productData.gstPercentage === undefined) {
            console.log('Skipping row (missing required fields):', row)
            totalSkipped++
            continue
          }
          
          // Create product
          await prisma.product.create({
            data: productData
          })
          totalAdded++
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`Skipping row (SKU already exists for distributor ${distributor.id}):`, row)
            totalSkipped++
          } else {
            console.error('Error creating product:', error)
            throw error
          }
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

