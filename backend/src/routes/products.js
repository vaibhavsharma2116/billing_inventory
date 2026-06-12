const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { authenticateToken, requireDistributor } = require('../middleware/auth')

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  // Skip converting phone numbers, names, gstins, addresses, dates, etc.
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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, lowStock, nearExpiry, inStock } = req.query
    let where = {}
    
    // Only filter by distributor if user is a distributor (not CSA/SUPER_ADMIN)
    if (req.user?.distributorId) {
      where.distributorId = req.user.distributorId
    }
    
    if (search) {
      where = {
        ...where,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { hsn: { contains: search, mode: 'insensitive' } }
        ]
      }
    }
    
    if (lowStock === 'true') {
      where = { ...where, currentStock: { lt: 10 } }
    }
    
    if (nearExpiry === 'true') {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      where = { ...where, expiryDate: { lte: thirtyDaysFromNow, not: null } }
    }
    
    if (inStock === 'true') {
      where = { ...where, currentStock: { gt: 0 } }
    }
    
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(products)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

router.get('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        invoiceItems: true,
        purchaseItems: true
      }
    })
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (product.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    res.json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

router.post('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { 
      name, sku, hsn, batchNo, expiryDate, 
      costPrice, baseSellingPrice, gstPercentage, currentStock 
    } = req.body
    
    if (!name || !sku || !costPrice || !baseSellingPrice || gstPercentage === undefined) {
      return res.status(400).json({ error: 'Required fields missing' })
    }
    
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        hsn: hsn || null,
        batchNo: batchNo || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        costPrice: parseFloat(costPrice),
        baseSellingPrice: parseFloat(baseSellingPrice),
        gstPercentage: parseFloat(gstPercentage),
        currentStock: currentStock ? parseInt(currentStock) : 0,
        distributorId: req.user.distributorId
      }
    })
    
    res.status(201).json(product)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

router.put('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      name, sku, hsn, batchNo, expiryDate, 
      costPrice, baseSellingPrice, gstPercentage, currentStock 
    } = req.body

    const existingProduct = await prisma.product.findUnique({ where: { id } })
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }
    if (existingProduct.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        hsn: hsn || null,
        batchNo: batchNo || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        costPrice: parseFloat(costPrice),
        baseSellingPrice: parseFloat(baseSellingPrice),
        gstPercentage: parseFloat(gstPercentage),
        currentStock: parseInt(currentStock)
      }
    })
    
    res.json(product)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

router.delete('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const existingProduct = await prisma.product.findUnique({ where: { id } })
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }
    if (existingProduct.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await prisma.product.delete({
      where: { id }
    })
    
    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

module.exports = router
