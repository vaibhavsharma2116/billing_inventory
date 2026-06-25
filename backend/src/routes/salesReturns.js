const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val) || 0
}

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'returnNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'salesReturnCount', 'paymentInCount', 'purchaseReturnCount', 'paymentOutCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'currentStock', 'baseSellingPrice', 'costPrice', 'gstPercentage', 'supplierName'].includes(keyName)) {
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

const DISTRIBUTOR_STATE_CODE = '27'

// Get all sales returns for a distributor
router.get('/', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const salesReturns = await prisma.salesReturn.findMany({
      where: { distributorId, csaId: null },
      include: {
        party: true,
        salesReturnItems: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(salesReturns))
  } catch (error) {
    console.error('Failed to fetch sales returns:', error)
    res.status(500).json({ error: 'Failed to fetch sales returns' })
  }
})

// Create a sales return
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const { partyId, items, reason, isInterState } = req.body

    if (!partyId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Party and items are required' })
    }

    // Get the last return number to generate new
    const lastReturn = await prisma.salesReturn.findFirst({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })
    let returnNo = 'RET-001'
    if (lastReturn) {
      const lastNum = parseInt(lastReturn.returnNo.split('-')[1]) || 0
      returnNo = `RET-${String(lastNum + 1).padStart(3, '0')}`
    }

    // Calculate totals
    let totalTaxable = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    let grandTotal = 0

    const processedItems = items.map(item => {
      const rate = getNum(item.rate)
      const qty = item.qty
      const gstPercentage = getNum(item.gstPercentage)
      const total = qty * rate
      const taxable = total / (1 + (gstPercentage / 100))
      const gstAmount = total - taxable
      let cgst = 0, sgst = 0, igst = 0

      if (isInterState) {
        igst = gstAmount
      } else {
        cgst = gstAmount / 2
        sgst = gstAmount / 2
      }
      
      totalTaxable += taxable
      totalCGST += cgst
      totalSGST += sgst
      totalIGST += igst
      grandTotal += total

      return {
        productId: item.productId,
        qty,
        costPrice: item.costPrice,
        rate,
        gstPercentage,
        total
      }
    })

    // Create sales return and update product stock
    const salesReturn = await prisma.salesReturn.create({
      data: {
        returnNo,
        partyId,
        distributorId,
        reason,
        taxableValue: totalTaxable,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        grandTotal,
        salesReturnItems: {
          create: processedItems.map(item => ({
            ...item,
            distributorId
          }))
        }
      },
      include: {
        party: true,
        salesReturnItems: { include: { product: true } }
      }
    })

    // Update product stock (increase since it's a return)
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.qty }
        }
      })
    }

    // Update distributor financials (decrease total amount realized)
    await prisma.distributor.update({
      where: { id: distributorId },
      data: {
        totalAmountRealized: { decrement: grandTotal }
      }
    })

    res.json(convertDecimals(salesReturn))
  } catch (error) {
    console.error('Failed to create sales return:', error)
    res.status(500).json({ error: 'Failed to create sales return' })
  }
})

module.exports = router
