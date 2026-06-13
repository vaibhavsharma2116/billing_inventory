const express = require('express')
const prisma = require('../lib/prisma')
const multer = require('multer')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { JWT_SECRET, authenticateToken } = require('../middleware/auth')
const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  if (['phone', 'name', 'gstin', 'gstIn', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'logo', 'email', 'password', 'role', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'companyName', 'ownerName', 'city', 'isActive', 'partyCount', 'productCount', 'invoiceCount', 'claimCount', 'distributorId', 'partyId', 'partyName', 'totalBilling', 'currentStock', 'baseSellingPrice', 'costPrice', 'gstPercentage'].includes(keyName)) {
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    console.log('Login attempt:', { email })

    const user = await prisma.user.findUnique({
      where: { email },
      include: { distributor: true }
    })

    if (!user) {
      console.log('User not found')
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isPasswordValid)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is suspended' })
    }

    if (user.distributor && !user.distributor.isActive) {
      return res.status(403).json({ error: 'Account is suspended' })
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        distributorId: user.distributorId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        logo: user.logo,
        phone: user.phone,
        gstin: user.gstin,
        city: user.city,
        distributorId: user.distributorId,
        distributor: user.distributor
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER'
      }
    })

    res.json(convertDecimals(user))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(convertDecimals(user))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(convertDecimals(users))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({
      where: { id }
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(convertDecimals(user))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

router.put('/:id', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params
    const { name, role } = req.body
    console.log('Updating user:', { id, name, role, hasFile: !!req.file, file: req.file, currentUserRole: req.user.role, currentUserId: req.user.userId })
    
    // Check permissions
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN'
    const isUpdatingOwnAccount = req.user.userId === id

    if (!isSuperAdmin && !isUpdatingOwnAccount) {
      return res.status(403).json({ error: 'You can only update your own account' })
    }

    // Prepare update data
    const updateData = {
      name
    }
    
    // Only SUPER_ADMIN can change role
    if (isSuperAdmin && role) {
      updateData.role = role
    }
    
    if (req.file) {
      updateData.logo = `/uploads/${req.file.filename}`
      console.log('Setting logo to:', updateData.logo)
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { distributor: true }
    })
    console.log('Updated user:', user)
    res.json(convertDecimals(user))
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.put('/change-password/self', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Old password is incorrect' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

module.exports = router
