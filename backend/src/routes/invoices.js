const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken, requireDistributor } = require('../middleware/auth')
const router = express.Router()

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'distributorId'].includes(keyName)) {
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

router.get('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { distributorId: req.user.distributorId },
      include: { party: true, invoiceItems: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(invoices)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

router.get('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { party: true, invoiceItems: { include: { product: true } } }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (invoice.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(invoice)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch invoice' })
  }
})

router.post('/create', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { partyId, items, isInterState } = req.body
    const { distributorId } = req.user

    if (!partyId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Party and items are required' })
    }

    const party = await prisma.party.findUnique({
      where: { id: partyId }
    })

    if (!party || party.distributorId !== distributorId) {
      return res.status(403).json({ error: 'Invalid party' })
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
      let invoiceStockCost = 0 // Total stock cost for this invoice

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })
        if (!product || product.distributorId !== distributorId) {
          throw new Error(`Product not found: ${item.productId}`)
        }
        if (product.currentStock < item.qty) {
          throw new Error(`Insufficient stock for product: ${product.name}`)
        }
        
        // Calculate stock cost for this item
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

      // Calculate invoice profit
      const invoiceProfit = grandTotal - invoiceStockCost
      const profitStatus = invoiceProfit >= 0 ? 'PROFIT' : 'LOSS'

      console.log(`📊 Invoice ${nextInvoiceNo} created:`)
      console.log(`  - Stock Cost: ₹${invoiceStockCost.toFixed(2)}`)
      console.log(`  - Revenue: ₹${grandTotal.toFixed(2)}`)
      console.log(`  - Profit: ₹${invoiceProfit.toFixed(2)} (${profitStatus})`)

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: nextInvoiceNo,
          partyId,
          distributorId,
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

      // Update distributor financials
      await tx.distributor.update({
        where: { id: distributorId },
        data: {
          totalAmountRealized: { increment: grandTotal },
          pendingCompanyBalance: { decrement: grandTotal }
        }
      })

      // Return invoice with profit data
      return {
        ...invoice,
        invoiceStockCost,
        invoiceProfit,
        profitStatus
      }
    })

    res.status(201).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Failed to create invoice' })
  }
})

router.put('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const { items, isInterState } = req.body
    const { distributorId } = req.user

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

    if (existingInvoice.distributorId !== distributorId) {
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
        where: { id: distributorId },
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
        if (!product || product.distributorId !== distributorId) {
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
        where: { id: distributorId },
        data: {
          totalAmountRealized: { increment: grandTotal },
          pendingCompanyBalance: { decrement: grandTotal }
        }
      })

      return invoice
    })

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Failed to edit invoice' })
  }
})

module.exports = router
