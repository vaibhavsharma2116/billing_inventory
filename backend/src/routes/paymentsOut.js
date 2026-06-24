const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

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

// Get all payments out for a distributor
router.get('/', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const paymentsOut = await prisma.paymentOut.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'asc' }
    })
    res.json(convertDecimals(paymentsOut))
  } catch (error) {
    console.error('Failed to fetch payments out:', error)
    res.status(500).json({ error: 'Failed to fetch payments out' })
  }
})

// Create a payment out
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const { supplierName, amount, paymentMode, referenceNo, notes } = req.body

    if (!supplierName || !amount || !paymentMode) {
      return res.status(400).json({ error: 'Supplier name, amount and payment mode are required' })
    }

    // Get the last payment number to generate new
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
        supplierName,
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

module.exports = router
