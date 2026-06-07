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
    
    const parties = await prisma.party.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(convertDecimals(parties))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch parties' })
  }
})

router.get('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const party = await prisma.party.findUnique({
      where: { id },
      include: { invoices: true }
    })
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' })
    }

    if (party.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    res.json(convertDecimals(party))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch party' })
  }
})

router.post('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { name, gstin, address, creditLimit, phone } = req.body
    console.log('Creating party - received:', { name, gstin, address, creditLimit, phone })
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const party = await prisma.party.create({
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        phone: phone !== undefined && phone !== null && phone !== '' ? String(phone) : null,
        distributorId: req.user.distributorId
      }
    })
    console.log('Created party:', party)
    
    res.status(201).json(party)
  } catch (error) {
    console.error('Error creating party:', error)
    res.status(500).json({ error: 'Failed to create party' })
  }
})

router.put('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const { name, gstin, address, creditLimit, phone } = req.body
    console.log('Updating party - id:', id, 'received:', { name, gstin, address, creditLimit, phone })

    const existingParty = await prisma.party.findUnique({ where: { id } })
    if (!existingParty) {
      return res.status(404).json({ error: 'Party not found' })
    }
    if (existingParty.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const party = await prisma.party.update({
      where: { id },
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        phone: phone !== undefined && phone !== null && phone !== '' ? String(phone) : null
      }
    })
    console.log('Updated party:', party)
    
    res.json(convertDecimals(party))
  } catch (error) {
    console.error('Error updating party:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Party not found' })
    }
    res.status(500).json({ error: 'Failed to update party' })
  }
})

router.delete('/:id', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params
    const existingParty = await prisma.party.findUnique({ where: { id } })
    if (!existingParty) {
      return res.status(404).json({ error: 'Party not found' })
    }
    if (existingParty.distributorId !== req.user.distributorId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await prisma.party.delete({
      where: { id }
    })
    
    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Party not found' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to delete party' })
  }
})

module.exports = router
