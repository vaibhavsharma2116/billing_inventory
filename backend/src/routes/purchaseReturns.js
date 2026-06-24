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
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'returnNo', 'paymentNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'salesReturnCount', 'paymentInCount', 'purchaseReturnCount', 'paymentOutCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'currentStock', 'baseSellingPrice', 'costPrice', 'gstPercentage', 'supplierName', 'paymentMode', 'referenceNo', 'notes', 'reason'].includes(keyName)) {
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

// Get all purchase returns for a distributor
router.get('/', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: { distributorId },
      include: {
        purchaseReturnItems: { include: { product: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
    res.json(convertDecimals(purchaseReturns))
  } catch (error) {
    console.error('Failed to fetch purchase returns:', error)
    res.status(500).json({ error: 'Failed to fetch purchase returns' })
  }
})

// Create a purchase return
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const { supplierName, items, reason, isInterState } = req.body

    if (!supplierName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier name and items are required' })
    }

    // Get the last return number to generate new
    const lastReturn = await prisma.purchaseReturn.findFirst({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })
    let returnNo = 'PR-001'
    if (lastReturn) {
      const lastNum = parseInt(lastReturn.returnNo.split('-')[1]) || 0
      returnNo = `PR-${String(lastNum + 1).padStart(3, '0')}`
    }

    // Calculate totals
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

    // Create purchase return and update product stock
    const purchaseReturn = await prisma.purchaseReturn.create({
      data: {
        returnNo,
        supplierName,
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

    // Update product stock (decrease since it's a return to supplier)
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

module.exports = router
