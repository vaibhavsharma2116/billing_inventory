const express = require('express')
const prisma = require('../lib/prisma')
const router = express.Router()
const { authenticateToken, requireDistributor } = require('../middleware/auth')

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  // Skip converting phone numbers, names, gstins, addresses, dates, etc.
  if (['phone', 'name', 'gstin', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'productName', 'partyName', 'productId', 'partyId', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'distributorId'].includes(keyName)) {
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

router.get('/inventory', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    const products = await prisma.product.findMany({
      where: { distributorId: req.user.distributorId },
      include: {
        invoiceItems: { where: { invoice: { date: { gte: start, lte: end }, distributorId: req.user.distributorId } } },
        purchaseItems: { where: { purchase: { date: { gte: start, lte: end }, distributorId: req.user.distributorId } } }
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

router.get('/party-sales', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const parties = await prisma.party.findMany({
      where: { distributorId: req.user.distributorId },
      include: {
        invoices: { where: { distributorId: req.user.distributorId, date: { gte: start, lte: end } }, include: { invoiceItems: true } }
      }
    })

    const partySales = parties.map(party => {
      const totalBilling = party.invoices.reduce((sum, inv) => {
        if (typeof inv?.grandTotal === 'number') return sum + inv.grandTotal
        if (inv?.grandTotal?.toNumber) return sum + inv.grandTotal.toNumber()
        if (typeof inv?.grandTotal === 'string' && !isNaN(parseFloat(inv.grandTotal))) return sum + parseFloat(inv.grandTotal)
        return sum
      }, 0)
      return {
        partyId: party.id,
        partyName: party.name,
        gstin: party.gstin,
        phone: party.phone,
        totalBilling,
        invoiceCount: party.invoices.length
      }
    })

    res.json(partySales.sort((a, b) => b.totalBilling - a.totalBilling))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch party sales' })
  }
})

router.get('/product-sales', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const products = await prisma.product.findMany({
      where: { distributorId: req.user.distributorId },
      include: {
        invoiceItems: { where: { invoice: { distributorId: req.user.distributorId, date: { gte: start, lte: end } } }, include: { invoice: true } }
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

router.get('/party-product-sales/:partyId', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { partyId } = req.params
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const party = await prisma.party.findUnique({ where: { id: partyId } })
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }
    if (party.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const invoices = await prisma.invoice.findMany({
      where: { partyId, distributorId: req.user.distributorId, date: { gte: start, lte: end } },
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

router.get('/party-ledger/:partyId', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { partyId } = req.params
    const { startDate, endDate } = req.query
    
    const party = await prisma.party.findUnique({ where: { id: partyId } })
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }
    if (party.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Default 90 days
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // Fetch all relevant data in parallel
    const [invoices, salesReturns, paymentsIn] = await Promise.all([
      prisma.invoice.findMany({
        where: { 
          partyId, 
          distributorId: req.user.distributorId,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.salesReturn.findMany({
        where: { 
          partyId, 
          distributorId: req.user.distributorId,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.paymentIn.findMany({
        where: { 
          partyId, 
          distributorId: req.user.distributorId,
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
    const totalDebit = invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
    const totalCredit = salesReturns.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0) + 
                       paymentsIn.reduce((sum, pin) => sum + getNum(pin.amount), 0)
    const closingBalance = totalDebit - totalCredit

    res.json(convertDecimals({
      party,
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
