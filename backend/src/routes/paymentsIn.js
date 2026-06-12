const express = require('express')
const prisma = require('../lib/prisma')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'returnNo', 'paymentNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'salesReturnCount', 'paymentInCount', 'purchaseReturnCount', 'paymentOutCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'currentStock', 'baseSellingPrice', 'costPrice', 'gstPercentage', 'supplierName', 'paymentMode', 'referenceNo', 'notes'].includes(keyName)) {
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

// Get all payments in for a distributor
router.get('/', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const paymentsIn = await prisma.paymentIn.findMany({
      where: { distributorId, csaId: null },
      include: { party: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(paymentsIn))
  } catch (error) {
    console.error('Failed to fetch payments in:', error)
    res.status(500).json({ error: 'Failed to fetch payments in' })
  }
})

// Create a payment in
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId
    const { partyId, amount, paymentMode, referenceNo, notes } = req.body

    if (!partyId || !amount || !paymentMode) {
      return res.status(400).json({ error: 'Party, amount and payment mode are required' })
    }

    // Get the last payment number to generate new
    const lastPayment = await prisma.paymentIn.findFirst({
      where: { distributorId },
      orderBy: { createdAt: 'desc' }
    })
    let paymentNo = 'PAY-001'
    if (lastPayment) {
      const lastNum = parseInt(lastPayment.paymentNo.split('-')[1]) || 0
      paymentNo = `PAY-${String(lastNum + 1).padStart(3, '0')}`
    }

    const paymentIn = await prisma.paymentIn.create({
      data: {
        paymentNo,
        partyId,
        distributorId,
        amount,
        paymentMode,
        referenceNo,
        notes
      },
      include: { party: true }
    })

    res.json(convertDecimals(paymentIn))
  } catch (error) {
    console.error('Failed to create payment in:', error)
    res.status(500).json({ error: 'Failed to create payment in' })
  }
})

module.exports = router
