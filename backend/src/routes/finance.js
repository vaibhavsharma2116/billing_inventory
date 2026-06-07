const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth')
const router = express.Router()

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

// Get complete financial overview for all distributors
router.get('/overview', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const distributors = await prisma.distributor.findMany({
      include: {
        invoices: { include: { invoiceItems: true } },
        purchaseLedgers: true
      }
    })

    const financialData = distributors.map(distributor => {
      // Calculate Total Company Debits (sum of all purchases)
      const totalCompanyDebits = distributor.purchaseLedgers.reduce((sum, pl) => sum + getNum(pl.totalAmount), 0)

      // Calculate Total Amount Realized (sum of all invoice grand totals)
      const totalAmountRealized = distributor.invoices.reduce((sum, inv) => sum + getNum(inv.grandTotal), 0)

      // Calculate Total Stock Cost (sum of qty * costPrice for all invoice items)
      let totalStockCost = 0
      distributor.invoices.forEach(inv => {
        inv.invoiceItems.forEach(item => {
          if (item.costPrice) {
            totalStockCost += item.qty * getNum(item.costPrice)
          }
        })
      })

      // Calculate Total Distributor Profit
      const totalDistributorProfit = totalAmountRealized - totalStockCost

      // Calculate Pending Company Balance
      const pendingCompanyBalance = totalCompanyDebits - totalAmountRealized

      return {
        distributorId: distributor.id,
        companyName: distributor.companyName,
        ownerName: distributor.ownerName,
        email: distributor.email,
        city: distributor.city,
        isActive: distributor.isActive,
        totalCompanyDebits,
        totalAmountRealized,
        totalStockCost,
        totalDistributorProfit,
        pendingCompanyBalance,
        invoiceCount: distributor.invoices.length,
        purchaseCount: distributor.purchaseLedgers.length
      }
    })

    // Calculate overall totals
    const overallTotals = financialData.reduce((acc, data) => ({
      totalCompanyDebits: acc.totalCompanyDebits + data.totalCompanyDebits,
      totalAmountRealized: acc.totalAmountRealized + data.totalAmountRealized,
      totalStockCost: acc.totalStockCost + data.totalStockCost,
      totalDistributorProfit: acc.totalDistributorProfit + data.totalDistributorProfit,
      totalPendingCompanyBalance: acc.totalPendingCompanyBalance + data.pendingCompanyBalance
    }), {
      totalCompanyDebits: 0,
      totalAmountRealized: 0,
      totalStockCost: 0,
      totalDistributorProfit: 0,
      totalPendingCompanyBalance: 0
    })

    res.json({
      overview: financialData,
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
