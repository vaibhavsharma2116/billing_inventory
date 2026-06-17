const http = require('http')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const prisma = require('./src/lib/prisma')

async function test() {
  // Get a real CSA user from DB
  const csaUser = await prisma.user.findFirst({ where: { role: 'CSA' } })
  if (!csaUser) {
    console.log('No CSA user found!')
    return
  }
  console.log('Found CSA user:', csaUser)
  
  const token = jwt.sign(
    { userId: csaUser.id, role: csaUser.role }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  )
  console.log('\nGenerated token:', token)
  
  // Call /api/csa/my-dashboard
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/csa/my-dashboard',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
  
  const req = http.request(options, (res) => {
    console.log('\nResponse status code:', res.statusCode)
    console.log('Headers:', res.headers)
    
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log('\nResponse data:', data)
    })
  })
  
  req.on('error', (e) => console.log('Error:', e))
  req.end()
}

test()
  .then(() => prisma.$disconnect())
  .catch((err) => console.error(err))
