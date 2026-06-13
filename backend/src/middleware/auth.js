const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.sendStatus(403)
    }

    // Check if user is still active
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })

    if (!dbUser || dbUser.isActive === false) {
      return res.sendStatus(403)
    }

    req.user = user
    next()
  })
}

const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' })
  }
  next()
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

const requireDistributor = (req, res, next) => {
  if (!req.user?.distributorId) {
    return res.status(403).json({ error: 'Distributor access required' })
  }
  next()
}

const requireCSA = (req, res, next) => {
  if (req.user?.role !== 'CSA') {
    return res.status(403).json({ error: 'CSA access required' })
  }
  next()
}

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  requireAdmin,
  requireCSA,
  requireDistributor,
  JWT_SECRET
}
