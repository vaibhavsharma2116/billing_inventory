const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const prisma = require('../lib/prisma')
const { authenticateToken, requireCSA } = require('../middleware/auth')
const router = express.Router()

const upload = multer({ dest: 'uploads/' })

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'salesReturnCount', 'paymentInCount', 'purchaseReturnCount', 'paymentOutCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'supplierName', 'paymentMode', 'referenceNo', 'notes', 'reason'].includes(keyName)) {
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
        where: { distributorId: dist.id, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
        where: { distributorId: dist.id, date: whereDateRange },
        _sum: { grandTotal: true }
      })
      const totalPaymentsInAgg = await prisma.paymentIn.aggregate({
        where: { distributorId: dist.id, date: whereDateRange },
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
        where: { distributorId: dist.id, date: whereDateRange }
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
        where: { distributorId: dist.id, date: whereDateRange }
      })
      const paymentInCount = await prisma.paymentIn.count({
        where: { distributorId: dist.id, date: whereDateRange }
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

    const distributor = await prisma.distributor.findUnique({
      where: { id, csaId },
      include: { users: true }
    })

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }

    const totalSalesAgg = await prisma.invoice.aggregate({
      where: { distributorId: id, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const totalSalesReturnsAgg = await prisma.salesReturn.aggregate({
      where: { distributorId: id, date: whereDateRange },
      _sum: { grandTotal: true }
    })
    const totalPaymentsInAgg = await prisma.paymentIn.aggregate({
      where: { distributorId: id, date: whereDateRange },
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
      where: { distributorId: id, date: whereDateRange }
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
      where: { distributorId: id, date: whereDateRange }
    })
    const paymentInCount = await prisma.paymentIn.count({
      where: { distributorId: id, date: whereDateRange }
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
          where: { distributorId: id, date: whereDateRange }
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
          where: { invoice: { distributorId: id, date: whereDateRange } },
          include: { invoice: true }
        }
      }
    })

    const invoices = await prisma.invoice.findMany({
      where: { distributorId: id, date: whereDateRange },
      include: { party: true, invoiceItems: true },
      orderBy: { createdAt: 'desc' }
    })

    const claims = await prisma.claim.findMany({
      where: { distributorId: id, createdAt: whereDateRange },
      orderBy: { createdAt: 'desc' }
    })

    const salesReturns = await prisma.salesReturn.findMany({
      where: { distributorId: id, date: whereDateRange },
      include: { party: true },
      orderBy: { createdAt: 'desc' }
    })

    const paymentsIn = await prisma.paymentIn.findMany({
      where: { distributorId: id, date: whereDateRange },
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
    const { items, isInterState } = req.body

    console.log('Creating invoice:', { distributorId, csaId, items: items.length, isInterState })

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
        
        if (product.distributorId !== distributorId) {
          throw new Error(`Product ${product.name} does not belong to this distributor`)
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
        include: { invoiceItems: { include: { product: true } } }
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
      where: { distributorId },
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
        const originalProduct = await tx.product.findUnique({ where: { id: item.productId } });
        if (!originalProduct) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        const productSku = item.sku || originalProduct.sku;
        
        let product = await tx.product.findUnique({
          where: { distributorId_sku: { distributorId, sku: productSku } }
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: originalProduct.name,
              sku: originalProduct.sku,
              hsn: originalProduct.hsn,
              batchNo: originalProduct.batchNo,
              expiryDate: originalProduct.expiryDate,
              costPrice: originalProduct.costPrice,
              baseSellingPrice: originalProduct.baseSellingPrice,
              gstPercentage: originalProduct.gstPercentage,
              currentStock: 0,
              distributorId
            }
          });
        }

        item.productId = product.id;

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
        distributorId
      }));

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo: nextReturnNo,
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
        include: { salesReturnItems: { include: { product: true } } }
      });

      await tx.distributor.update({
        where: { id: distributorId },
        data: {
          totalAmountRealized: { decrement: grandTotal },
          pendingCompanyBalance: { increment: grandTotal }
        }
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
    res.json(uniqueSupplierNames)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

router.post('/distributors/:distributorId/purchase/upload', authenticateToken, requireCSA, upload.single('file'), async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const supplierName = req.body.supplierName || 'Supplier'
    
    let items = []
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet)

    items = jsonDataWithHeaders.map((row) => ({
      productName: row['Product Name'] || row['ProductName'] || row['name'] || row['Name'] || '',
      sku: row['SKU'] || row['sku'] || row['Sku'] || '',
      batchNo: row['Batch'] || row['Batch No'] || row['batchNo'] || row['batch'] || '',
      expiryDate: row['Expiry'] || row['Expiry Date'] || row['expiryDate'] || row['expiry'] || null,
      costPrice: parseFloat(row['Cost Price'] || row['costPrice'] || row['cost'] || row['Cost'] || 0),
      gstPercentage: parseFloat(row['GST%'] || row['GST'] || row['gstPercentage'] || row['gst'] || 0),
      quantity: parseInt(row['Quantity'] || row['Qty'] || row['quantity'] || row['qty'] || row['Stock'] || row['stock'] || 0)
    })).filter(item => item.sku || item.productName)

    if (items.length === 0) {
      return res.status(400).json({ 
        error: 'No valid items found in file', 
        rawData: jsonDataWithHeaders,
        message: 'Make sure your Excel has columns like: Product Name, SKU, Cost Price, Quantity'
      })
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)
    
    const purchaseLedger = await prisma.purchaseLedger.create({
      data: {
        supplierName,
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

      if (item.sku) {
        product = await prisma.product.upsert({
          where: { 
            distributorId_sku: {
              distributorId,
              sku: item.sku
            }
          },
          update: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice,
            ...(item.batchNo && { batchNo: item.batchNo }),
            ...(item.expiryDate && { expiryDate: new Date(item.expiryDate) })
          },
          create: {
            name: item.productName || 'Unnamed Product',
            sku: item.sku,
            hsn: '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            distributorId
          }
        })
      } else {
        product = await prisma.product.create({
          data: {
            name: item.productName || 'Unnamed Product',
            sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hsn: '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            distributorId
          }
        })
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
        action: item.sku ? (product ? 'updated' : 'created') : 'created'
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
    const [purchases, purchaseReturns, paymentsOut] = await Promise.all([
      prisma.purchaseLedger.findMany({
        where: { csaId },
        select: { supplierName: true },
        distinct: ['supplierName']
      }),
      prisma.purchaseReturn.findMany({
        where: { csaId },
        select: { supplierName: true },
        distinct: ['supplierName']
      }),
      prisma.paymentOut.findMany({
        where: { csaId },
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
    res.json(uniqueSupplierNames)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

// CSA's own purchase upload
router.post('/my-purchases/upload', authenticateToken, requireCSA, upload.single('file'), async (req, res) => {
  try {
    const csaId = req.user.userId
    console.log('=== POST /my-purchases/upload - CSA ID:', csaId)

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const supplierName = req.body.supplierName || 'Supplier'
    
    let items = []
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet)
    console.log('Uploaded Excel data:', jsonDataWithHeaders)

    items = jsonDataWithHeaders.map((row) => ({
      productName: row['Product Name'] || row['ProductName'] || row['name'] || row['Name'] || '',
      sku: row['SKU'] || row['sku'] || row['Sku'] || '',
      batchNo: row['Batch'] || row['Batch No'] || row['batchNo'] || row['batch'] || '',
      expiryDate: row['Expiry'] || row['Expiry Date'] || row['expiryDate'] || row['expiry'] || null,
      costPrice: parseFloat(row['Cost Price'] || row['costPrice'] || row['cost'] || row['Cost'] || 0),
      gstPercentage: parseFloat(row['GST%'] || row['GST'] || row['gstPercentage'] || row['gst'] || 0),
      quantity: parseInt(row['Quantity'] || row['Qty'] || row['quantity'] || row['qty'] || row['Stock'] || row['stock'] || 0)
    })).filter(item => item.sku || item.productName)
    console.log('Processed items:', items)

    if (items.length === 0) {
      return res.status(400).json({ 
        error: 'No valid items found in file', 
        rawData: jsonDataWithHeaders,
        message: 'Make sure your Excel has columns like: Product Name, SKU, Cost Price, Quantity'
      })
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)
    
    const purchaseLedger = await prisma.purchaseLedger.create({
      data: {
        supplierName,
        invoiceNo: `PUR-${Date.now()}`,
        totalAmount,
        csaId
      }
    })
    console.log('Created purchase ledger:', purchaseLedger.id)

    const results = []

    for (const item of items) {
      let product
      console.log('Processing item:', item)
      
      // Check if CSA already has a product with this SKU
      product = await prisma.product.findFirst({
        where: { csaId, sku: item.sku }
      })
      console.log('Found existing CSA product:', product ? { id: product.id, sku: product.sku, currentStock: product.currentStock } : null)
      
      if (product) {
        // Update existing product stock
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice,
            name: item.productName || product.name,
            hsn: product.hsn || '',
            batchNo: item.batchNo || product.batchNo,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : product.expiryDate,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage
          }
        })
        console.log('Updated product:', { id: product.id, currentStock: product.currentStock })
      } else {
        // Create new product
        product = await prisma.product.create({
          data: {
            name: item.productName || 'Unnamed Product',
            sku: item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hsn: '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            csaId
          }
        })
        console.log('Created new product:', { id: product.id, sku: product.sku, currentStock: product.currentStock })
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
        action: product ? 'updated' : 'created'
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

// CSA's own products
router.get('/my-products', authenticateToken, requireCSA, async (req, res) => {
  try {
    const csaId = req.user.userId
    console.log('=== GET /my-products - CSA ID:', csaId)
    
    // Get all products (to find all unique SKUs and product details)
    const allProducts = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    })
    console.log('All products count:', allProducts.length)
    
    // Group products by SKU to get unique products
    const uniqueProductsBySku = {}
    allProducts.forEach(product => {
      if (!uniqueProductsBySku[product.sku]) {
        uniqueProductsBySku[product.sku] = product
      }
    })
    console.log('Unique products by SKU count:', Object.keys(uniqueProductsBySku).length)
    
    // Get CSA's own products
    const csaProducts = await prisma.product.findMany({
      where: { csaId }
    })
    console.log('CSA products count:', csaProducts.length)
    console.log('CSA products:', csaProducts.map(p => ({ id: p.id, sku: p.sku, currentStock: p.currentStock })))
    
    // Create a map of CSA's products by SKU
    const csaProductsBySku = {}
    csaProducts.forEach(product => {
      csaProductsBySku[product.sku] = product
    })
    
    // Combine the data: use product details from unique products, but stock from CSA's products
    const result = Object.values(uniqueProductsBySku).map(product => {
      const csaProduct = csaProductsBySku[product.sku]
      const combined = {
        ...product,
        id: csaProduct?.id || product.id, // Use CSA's product ID if available
        csaId: csaProduct?.csaId || null,
        currentStock: csaProduct?.currentStock || 0
      }
      console.log(`Combined product for SKU ${product.sku}:`, { 
        original: { id: product.id, currentStock: product.currentStock, csaId: product.csaId },
        csa: csaProduct ? { id: csaProduct.id, currentStock: csaProduct.currentStock } : null,
        combined: { id: combined.id, currentStock: combined.currentStock, csaId: combined.csaId }
      })
      return combined
    })
    
    console.log('Final result to send:', result)
    res.json(convertDecimals(result))
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
        party: true, 
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
      include: { party: true },
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
router.get('/my-reports/party-sales', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const distributors = await prisma.distributor.findMany({
      where: { csaId },
      include: {
        invoices: { where: { date: { gte: start, lte: end } }, include: { invoiceItems: true } }
      }
    })

    const distributorSales = distributors.map(dist => {
      const totalBilling = dist.invoices.reduce((sum, inv) => {
        if (typeof inv?.grandTotal === 'number') return sum + inv.grandTotal
        if (inv?.grandTotal?.toNumber) return sum + inv.grandTotal.toNumber()
        if (typeof inv?.grandTotal === 'string' && !isNaN(parseFloat(inv.grandTotal))) return sum + parseFloat(inv.grandTotal)
        return sum
      }, 0)
      return {
        partyId: dist.id,
        partyName: dist.companyName,
        gstin: dist.gstIn,
        phone: dist.phone,
        totalBilling,
        invoiceCount: dist.invoices.length
      }
    })

    res.json(distributorSales.sort((a, b) => b.totalBilling - a.totalBilling))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch distributor sales' })
  }
})

// CSA Product-wise Sales Report (for all CSA-managed distributors)
router.get('/my-reports/product-sales', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Get all products from CSA's distributors
    const products = await prisma.product.findMany({
      where: { distributor: { csaId } },
      include: {
        invoiceItems: { 
          where: { 
            invoice: { 
              distributor: { csaId }, 
              date: { gte: start, lte: end } 
            } 
          }, 
          include: { invoice: true } 
        }
      }
    })

    const getNum = (val) => {
      if (typeof val === 'number') return val
      if (val?.toNumber) return val.toNumber()
      return parseFloat(val)
    }
    const productSales = products.map(product => {
      const totalQtySold = product.invoiceItems.reduce((sum, ii) => sum + ii.qty, 0)
      const totalRevenue = product.invoiceItems.reduce((sum, ii) => sum + getNum(ii.total), 0)
      const totalCost = totalQtySold * getNum(product.costPrice)
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        totalQtySold,
        totalRevenue,
        totalCost,
        profitMargin: profitMargin.toFixed(2)
      }
    })

    res.json(convertDecimals(productSales.sort((a, b) => b.totalRevenue - a.totalRevenue)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch product sales' })
  }
})

// CSA Distributor-wise Product Sales
router.get('/my-reports/party-product-sales/:partyId', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { partyId } = req.params
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const distributor = await prisma.distributor.findUnique({ where: { id: partyId } })
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }
    if (distributor.csaId !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const invoices = await prisma.invoice.findMany({
      where: { distributorId: partyId, date: { gte: start, lte: end } },
      include: {
        invoiceItems: { include: { product: true } }
      },
      orderBy: { date: 'desc' }
    })

    const productSales = []
    invoices.forEach(invoice => {
      invoice.invoiceItems.forEach(item => {
        const existing = productSales.find(ps => ps.productId === item.productId)
        if (existing) {
          existing.totalQty += item.qty
          existing.orders.push({
            date: invoice.date,
            invoiceNo: invoice.invoiceNo,
            qty: item.qty,
            rate: item.rate
          })
        } else {
          productSales.push({
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            totalQty: item.qty,
            orders: [{
              date: invoice.date,
              invoiceNo: invoice.invoiceNo,
              qty: item.qty,
              rate: item.rate
            }]
          })
        }
      })
    })

    res.json(convertDecimals(productSales))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch party product sales' })
  }
})

// CSA Inventory Valuation Report (for all CSA-managed distributors)
router.get('/my-reports/inventory', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    const products = await prisma.product.findMany({
      where: { distributor: { csaId } },
      include: {
        invoiceItems: { where: { invoice: { date: { gte: start, lte: end }, distributor: { csaId } } } },
        purchaseItems: { where: { purchase: { date: { gte: start, lte: end }, distributor: { csaId } } } }
      }
    })

    const inventoryData = products.map(product => {
      const totalPurchases = product.purchaseItems.reduce((sum, pi) => sum + pi.qty, 0)
      const totalSales = product.invoiceItems.reduce((sum, ii) => sum + ii.qty, 0)
      const openingStock = product.currentStock - totalPurchases + totalSales
      const closingStock = product.currentStock

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        openingStock,
        purchases: totalPurchases,
        sales: totalSales,
        closingStock,
        value: closingStock * product.costPrice
      }
    })

    res.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      inventory: inventoryData,
      totalValue: inventoryData.reduce((sum, item) => sum + item.value, 0)
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch inventory report' })
  }
})

// CSA Distributor Ledger Report
router.get('/my-reports/party-ledger/:partyId', authenticateToken, requireCSA, async (req, res) => {
  try {
    const { partyId } = req.params
    const { startDate, endDate } = req.query
    const csaId = req.user.userId
    
    const distributor = await prisma.distributor.findUnique({ where: { id: partyId } })
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' })
    }
    if (distributor.csaId !== csaId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Default 90 days
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Fetch all relevant data in parallel for the distributor
    const [invoices, salesReturns, paymentsIn, paymentsOut, purchaseReturns] = await Promise.all([
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
      prisma.paymentOut.findMany({
        where: { 
          distributorId: partyId, 
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.purchaseReturn.findMany({
        where: { 
          distributorId: partyId, 
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      })
    ])

    // Helper to get numeric grandTotal
    const getNum = (val) => {
      if (typeof val === 'number') return val
      if (val?.toNumber) return val.toNumber()
      if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val)
      return 0
    }

    // Combine and sort all ledger entries
    const ledgerEntries = []
    
    // Add invoices (debit - party owes us)
    invoices.forEach(inv => {
      ledgerEntries.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        type: 'Invoice',
        refNo: inv.invoiceNo,
        debit: getNum(inv.grandTotal),
        credit: 0,
        balance: 0 // Will calculate later
      })
    })

    // Add sales returns (credit - we owe party)
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

    // Add payments in (credit - party paid us)
    paymentsIn.forEach(pin => {
      ledgerEntries.push({
        id: `pin-${pin.id}`,
        date: pin.date,
        type: 'Payment Received',
        refNo: pin.paymentNo,
        debit: 0,
        credit: getNum(pin.amount),
      })
    })

    // Add payments out (debit - we paid supplier)
    paymentsOut.forEach(pout => {
      ledgerEntries.push({
        id: `pout-${pout.id}`,
        date: pout.date,
        type: 'Payment Out',
        refNo: pout.paymentNo,
        debit: getNum(pout.amount),
        credit: 0,
        balance: 0
      })
    })

    // Add purchase returns (credit - supplier owes us)
    purchaseReturns.forEach(pr => {
      ledgerEntries.push({
        id: `pr-${pr.id}`,
        date: pr.date,
        type: 'Purchase Return',
        refNo: pr.returnNo,
        debit: 0,
        credit: getNum(pr.grandTotal),
        balance: 0
      })
    })

    // Sort all entries by date
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Calculate running balance
    let runningBalance = 0
    ledgerEntries.forEach(entry => {
      runningBalance += entry.debit - entry.credit
      entry.balance = runningBalance
    })

    // Calculate summary
    const totalDebit = invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0) +
                     paymentsOut.reduce((sum, pout) => sum + getNum(pout.amount), 0)
    const totalCredit = salesReturns.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0) + 
                       paymentsIn.reduce((sum, pin) => sum + getNum(pin.amount), 0) +
                       purchaseReturns.reduce((sum, pr) => sum + getNum(pr.grandTotal), 0)
    const closingBalance = totalDebit - totalCredit

    res.json(convertDecimals({
      party: distributor,
      ledgerEntries,
      summary: {
        totalDebit,
        totalCredit,
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

module.exports = router