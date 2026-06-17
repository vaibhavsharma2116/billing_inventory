const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { authenticateToken, requireDistributor, requireSuperAdmin, requireAdmin, requireCSA } = require('../middleware/auth')

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'distributorId', 'csaId', 'email'].includes(keyName)) {
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

// Super Admin routes to manage suppliers for any distributor
router.get('/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { distributorId, search } = req.query
    let where = {}
    
    if (distributorId) {
      where.distributorId = distributorId
    }
    
    if (search) {
      where = {
        ...where,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { gstin: { contains: search, mode: 'insensitive' } }
        ]
      }
    }
    
    const suppliers = await prisma.supplier.findMany({
      where,
      include: { 
        distributor: { select: { id: true, companyName: true } },
        csa: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(convertDecimals(suppliers))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

router.post('/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, gstin, address, phone, email, csaId, isForAllCSAs } = req.body
    console.log('Creating supplier - received:', { name, gstin, address, phone, email, csaId, isForAllCSAs })
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const supplier = await prisma.supplier.create({
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        phone: phone !== undefined && phone !== null && phone !== '' ? String(phone) : null,
        email: email || null,
        csaId: csaId || null,
        isForAllCSAs: isForAllCSAs || false,
        distributorId: null
      }
    })
    console.log('Created supplier:', supplier)
    
    res.status(201).json(convertDecimals(supplier))
  } catch (error) {
    console.error('Error creating supplier (full error):', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    res.status(500).json({ error: 'Failed to create supplier', details: error.message })
  }
})

router.put('/all/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, gstin, address, phone, email, csaId, isForAllCSAs } = req.body
    console.log('Updating supplier - id:', id, 'received:', { name, gstin, address, phone, email, csaId, isForAllCSAs })

    const existingSupplier = await prisma.supplier.findUnique({ where: { id } })
    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    
    const updateData = {
      name,
      gstin: gstin || null,
      address: address || null,
      phone: phone !== undefined && phone !== null && phone !== '' ? String(phone) : null,
      email: email || null,
      csaId: csaId !== undefined ? (csaId || null) : existingSupplier.csaId,
      isForAllCSAs: isForAllCSAs !== undefined ? isForAllCSAs : existingSupplier.isForAllCSAs,
      distributorId: null
    }
    console.log('Update data:', updateData)
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData
    })
    console.log('Updated supplier:', supplier)
    
    res.json(convertDecimals(supplier))
  } catch (error) {
    console.error('Error updating supplier (full error):', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    res.status(500).json({ error: 'Failed to update supplier', details: error.message })
  }
})

router.delete('/all/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const existingSupplier = await prisma.supplier.findUnique({ where: { id } })
    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    await prisma.supplier.delete({
      where: { id }
    })
    
    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to delete supplier' })
  }
})

// Distributor routes to manage their own suppliers
router.get('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { search } = req.query
    let where = {
      distributorId: req.user.distributorId
    }
    
    if (search) {
      where = {
        ...where,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { gstin: { contains: search, mode: 'insensitive' } }
        ]
      }
    }
    
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(convertDecimals(suppliers))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

router.get('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { purchaseLedgers: true }
    })
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' })
    }

    if (supplier.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    res.json(convertDecimals(supplier))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch supplier' })
  }
})

router.post('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { name, gstin, address, phone, email } = req.body
    console.log('Creating supplier - received:', { name, gstin, address, phone, email })
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const supplier = await prisma.supplier.create({
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        phone: phone !== undefined && phone !== null && phone !== '' ? String(phone) : null,
        email: email || null,
        distributorId: req.user.distributorId
      }
    })
    console.log('Created supplier:', supplier)
    
    res.status(201).json(convertDecimals(supplier))
  } catch (error) {
    console.error('Error creating supplier:', error)
    res.status(500).json({ error: 'Failed to create supplier' })
  }
})

router.put('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const { name, gstin, address, phone, email } = req.body
    console.log('Updating supplier - id:', id, 'received:', { name, gstin, address, phone, email })

    const existingSupplier = await prisma.supplier.findUnique({ where: { id } })
    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    if (existingSupplier.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        phone: phone !== undefined && phone !== null && phone !== '' ? String(phone) : null,
        email: email || null
      }
    })
    console.log('Updated supplier:', supplier)
    
    res.json(convertDecimals(supplier))
  } catch (error) {
    console.error('Error updating supplier:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    res.status(500).json({ error: 'Failed to update supplier' })
  }
})

router.delete('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const existingSupplier = await prisma.supplier.findUnique({ where: { id } })
    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    if (existingSupplier.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await prisma.supplier.delete({
      where: { id }
    })
    
    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to delete supplier' })
  }
})

module.exports = router