const express = require('express')
const prisma = require('../lib/prisma')
const router = express.Router()
const { authenticateToken, requireDistributor } = require('../middleware/auth')

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (obj instanceof Date) return obj
  // Skip converting phone numbers, names, gstins, addresses, dates, etc.
  if (['phone', 'name', 'gstin', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'date', 'invoiceDate', 'createdAt', 'updatedAt', 'expiryDate', 'distributorId', 'createdByRole', 'createdByUserId', 'month'].includes(keyName)) {
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

router.get('/extra-margin', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { 
        extraMarginPercentage: { gt: 0 },
        invoice: { distributorId: req.user.distributorId, csaId: null, date: { gte: start, lte: end } }
      },
      include: { product: true, invoice: true }
    })

    const salesReturnItems = await prisma.salesReturnItem.findMany({
      where: {
        salesReturn: { distributorId: req.user.distributorId, csaId: null, date: { gte: start, lte: end } }
      },
      include: { product: true, salesReturn: true }
    })

    const productMarginMap = {}

    const invoiceClaims = invoiceItems.map(item => {
      const getNum = (val) => {
        if (typeof val === 'number') return val
        if (val?.toNumber) return val.toNumber()
        return parseFloat(val) || 0
      }
      
      const marginPct = getNum(item.extraMarginPercentage)
      if (!productMarginMap[item.productId]) {
        productMarginMap[item.productId] = { totalPct: 0, count: 0 }
      }
      productMarginMap[item.productId].totalPct += marginPct
      productMarginMap[item.productId].count += 1

      const baseAmount = item.qty * getNum(item.rate)
      const marginAmount = (baseAmount * marginPct) / 100
      
      return {
        id: item.id,
        productName: item.product.name,
        invoiceNo: item.invoice.invoiceNo,
        invoiceDate: item.invoice.date,
        qty: item.qty,
        rate: getNum(item.rate),
        extraMarginPercentage: marginPct,
        claimAmount: marginAmount
      }
    })

    const returnClaims = salesReturnItems.filter(sr => productMarginMap[sr.productId]).map(sr => {
      const getNum = (val) => {
        if (typeof val === 'number') return val
        if (val?.toNumber) return val.toNumber()
        return parseFloat(val) || 0
      }

      const mapData = productMarginMap[sr.productId]
      const avgPct = mapData.count > 0 ? (mapData.totalPct / mapData.count) : 0
      
      const baseAmount = sr.qty * getNum(sr.rate)
      const marginAmount = (baseAmount * avgPct) / 100

      return {
        id: sr.id,
        productName: sr.product.name,
        invoiceNo: sr.salesReturn.returnNo + ' (Return)',
        invoiceDate: sr.salesReturn.date,
        qty: -sr.qty,
        rate: getNum(sr.rate),
        extraMarginPercentage: avgPct,
        claimAmount: -marginAmount
      }
    })

    const claims = [...invoiceClaims, ...returnClaims]
    // Sort by date descending
    claims.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))

    const totalClaimAmount = claims.reduce((sum, c) => sum + c.claimAmount, 0)

    res.json(convertDecimals({
      claims,
      totalClaimAmount,
      count: claims.length
    }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch extra margin claims' })
  }
})

router.get('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const claims = await prisma.claim.findMany({
      where: { distributorId: req.user.distributorId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(claims))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch claims' })
  }
})

router.post('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { brandName, claimDetails, amount, status } = req.body
    const claim = await prisma.claim.create({
      data: {
        brandName,
        claimDetails,
        amount: parseFloat(amount),
        status: status || 'PENDING',
        distributorId: req.user.distributorId,
        createdByRole: 'DISTRIBUTOR',
        createdByUserId: req.user.userId || req.user.distributorId
      }
    })
    res.status(201).json(convertDecimals(claim))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create claim' })
  }
})

router.put('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const existingClaim = await prisma.claim.findUnique({ where: { id } })
    if (!existingClaim) {
      return res.status(404).json({ error: 'Claim not found' })
    }
    if (existingClaim.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { brandName, claimDetails, amount, status } = req.body
    const claim = await prisma.claim.update({
      where: { id },
      data: {
        brandName,
        claimDetails,
        amount: parseFloat(amount),
        status,
        createdByRole: existingClaim.createdByRole || 'DISTRIBUTOR',
        createdByUserId: existingClaim.createdByUserId || (req.user.userId || req.user.distributorId)
      }
    })
    res.json(convertDecimals(claim))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update claim' })
  }
})

router.delete('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const existingClaim = await prisma.claim.findUnique({ where: { id } })
    if (!existingClaim) {
      return res.status(404).json({ error: 'Claim not found' })
    }
    if (existingClaim.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await prisma.claim.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete claim' })
  }
})

router.get('/gst-summary', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const invoices = await prisma.invoice.findMany({
      where: { distributorId: req.user.distributorId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' }
    })

    const salesReturns = await prisma.salesReturn.findMany({
      where: { distributorId: req.user.distributorId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' }
    })

    const monthlyData = {}

    const processRecord = (record, isReturn = false) => {
      const date = new Date(record.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: monthName,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0
        }
      }

      const getNum = (val) => {
        if (typeof val === 'number') return val
        if (val?.toNumber) return val.toNumber()
        if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val)
        return 0
      }

      const multiplier = isReturn ? -1 : 1

      monthlyData[key].taxableValue += (getNum(record.taxableValue) * multiplier)
      monthlyData[key].cgst += (getNum(record.cgst) * multiplier)
      monthlyData[key].sgst += (getNum(record.sgst) * multiplier)
      monthlyData[key].igst += (getNum(record.igst) * multiplier)
      monthlyData[key].total += (getNum(record.grandTotal) * multiplier)
    }

    invoices.forEach(inv => processRecord(inv, false))
    salesReturns.forEach(sr => processRecord(sr, true))

    const gstReport = Object.values(monthlyData).sort((a, b) => {
      const [yearA, monthA] = a.month.split(' ').reverse()
      const [yearB, monthB] = b.month.split(' ').reverse()
      return parseInt(yearA) - parseInt(yearB) || 
        new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`)
    })

    res.json(convertDecimals(gstReport))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch GST summary' })
  }
})

module.exports = router
