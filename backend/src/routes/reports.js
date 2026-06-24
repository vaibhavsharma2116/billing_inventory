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

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val)
  return 0
}

router.get('/inventory', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const products = await prisma.product.findMany({
      where: { distributorId: req.user.distributorId },
      include: {
        invoiceItems: { where: { invoice: { distributorId: req.user.distributorId } }, include: { invoice: true } },
        purchaseItems: { where: { purchase: { distributorId: req.user.distributorId } }, include: { purchase: true } },
        salesReturnItems: { where: { salesReturn: { distributorId: req.user.distributorId } }, include: { salesReturn: true } },
        purchaseReturnItems: { where: { purchaseReturn: { distributorId: req.user.distributorId } }, include: { purchaseReturn: true } }
      }
    })

    const inventoryData = products.map(product => {
      const purchasesAfterEnd = product.purchaseItems.filter(pi => new Date(pi.purchase.date) > end).reduce((sum, pi) => sum + pi.qty, 0)
      const salesAfterEnd = product.invoiceItems.filter(ii => new Date(ii.invoice.date) > end).reduce((sum, ii) => sum + ii.qty, 0)
      const salesReturnsAfterEnd = product.salesReturnItems.filter(sr => new Date(sr.salesReturn.date) > end).reduce((sum, sr) => sum + sr.qty, 0)
      const purchaseReturnsAfterEnd = product.purchaseReturnItems.filter(pr => new Date(pr.purchaseReturn.date) > end).reduce((sum, pr) => sum + pr.qty, 0)

      const closingStock = product.currentStock - purchasesAfterEnd + salesAfterEnd - salesReturnsAfterEnd + purchaseReturnsAfterEnd

      const purchasesInPeriod = product.purchaseItems.filter(pi => {
        const d = new Date(pi.purchase.date)
        return d >= start && d <= end
      }).reduce((sum, pi) => sum + pi.qty, 0)

      const salesInPeriod = product.invoiceItems.filter(ii => {
        const d = new Date(ii.invoice.date)
        return d >= start && d <= end
      }).reduce((sum, ii) => sum + ii.qty, 0)

      const salesReturnsInPeriod = product.salesReturnItems.filter(sr => {
        const d = new Date(sr.salesReturn.date)
        return d >= start && d <= end
      }).reduce((sum, sr) => sum + sr.qty, 0)

      const purchaseReturnsInPeriod = product.purchaseReturnItems.filter(pr => {
        const d = new Date(pr.purchaseReturn.date)
        return d >= start && d <= end
      }).reduce((sum, pr) => sum + pr.qty, 0)

      const netPurchases = purchasesInPeriod - purchaseReturnsInPeriod
      const netSales = salesInPeriod - salesReturnsInPeriod

      const openingStock = closingStock - netPurchases + netSales

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        openingStock,
        purchases: purchasesInPeriod,
        sales: salesInPeriod,
        closingStock,
        value: closingStock * getNum(product.costPrice)
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
        invoices: { where: { distributorId: req.user.distributorId, date: { gte: start, lte: end } } },
        salesReturns: { where: { distributorId: req.user.distributorId, date: { gte: start, lte: end } } }
      }
    })

    const partySales = parties.map(party => {
      const grossBilling = party.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)
      const totalReturns = party.salesReturns.reduce((sum, sr) => sum + getNum(sr.grandTotal), 0)
      const totalBilling = grossBilling - totalReturns

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
        invoiceItems: { where: { invoice: { distributorId: req.user.distributorId, date: { gte: start, lte: end } } } },
        salesReturnItems: { where: { salesReturn: { distributorId: req.user.distributorId, date: { gte: start, lte: end } } } }
      }
    })

    const productSales = products.map(product => {
      const grossQtySold = product.invoiceItems.reduce((sum, ii) => sum + ii.qty, 0)
      const returnQty = product.salesReturnItems.reduce((sum, sr) => sum + sr.qty, 0)
      const totalQtySold = grossQtySold - returnQty

      const grossRevenue = product.invoiceItems.reduce((sum, ii) => sum + getNum(ii.total), 0)
      const returnRevenue = product.salesReturnItems.reduce((sum, sr) => sum + getNum(sr.total), 0)
      const totalRevenue = grossRevenue - returnRevenue

      const grossCost = product.invoiceItems.reduce((sum, ii) => sum + (getNum(ii.costPrice || product.costPrice) * ii.qty), 0)
      const returnCost = product.salesReturnItems.reduce((sum, sr) => sum + (getNum(sr.costPrice || product.costPrice) * sr.qty), 0)
      const totalCost = grossCost - returnCost

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

    const salesReturns = await prisma.salesReturn.findMany({
      where: { partyId, distributorId: req.user.distributorId, date: { gte: start, lte: end } },
      include: {
        salesReturnItems: { include: { product: true } }
      }
    })

    const productSalesMap = new Map()

    invoices.forEach(invoice => {
      invoice.invoiceItems.forEach(item => {
        if (!productSalesMap.has(item.productId)) {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            totalQty: 0,
            orders: []
          })
        }
        const existing = productSalesMap.get(item.productId)
        existing.totalQty += item.qty
        existing.orders.push({
          date: invoice.date,
          invoiceNo: invoice.invoiceNo,
          qty: item.qty,
          rate: item.rate,
          type: 'Invoice'
        })
      })
    })

    salesReturns.forEach(sr => {
      sr.salesReturnItems.forEach(item => {
        if (!productSalesMap.has(item.productId)) {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            totalQty: 0,
            orders: []
          })
        }
        const existing = productSalesMap.get(item.productId)
        existing.totalQty -= item.qty
        existing.orders.push({
          date: sr.date,
          invoiceNo: sr.returnNo,
          qty: -item.qty,
          rate: item.rate,
          type: 'Sales Return'
        })
      })
    })

    const productSales = Array.from(productSalesMap.values()).filter(ps => ps.totalQty > 0 || ps.orders.length > 0)
    
    productSales.forEach(ps => {
      ps.orders.sort((a, b) => new Date(b.date) - new Date(a.date))
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

    // Fetch all relevant data in parallel for the selected period and prior period
    const [invoices, salesReturns, paymentsIn, openingInvoices, openingSalesReturns, openingPaymentsIn] = await Promise.all([
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
      }),
      prisma.invoice.findMany({
        where: {
          partyId,
          distributorId: req.user.distributorId,
          date: { lt: start }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.salesReturn.findMany({
        where: {
          partyId,
          distributorId: req.user.distributorId,
          date: { lt: start }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.paymentIn.findMany({
        where: {
          partyId,
          distributorId: req.user.distributorId,
          date: { lt: start }
        },
        orderBy: { date: 'asc' }
      })
    ])

    // Removed redundant getNum definition since we have it globally at the top
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
      party,
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

module.exports = router
