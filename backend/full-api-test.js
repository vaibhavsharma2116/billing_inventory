const http = require('http')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

const token = jwt.sign(
  { 
    userId: 'cmpz8fs9i0001izqrwp4h857p',
    role: 'CSA' 
  }, 
  JWT_SECRET, 
  { expiresIn: '24h' }
)

console.log('Using token:', token)
console.log('\nCalling /csa/my-reports/product-sales...\n')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/csa/my-reports/product-sales',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode)
  
  let data = ''
  
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    console.log('\nResponse:')
    try {
      const jsonData = JSON.parse(data)
      console.log(JSON.stringify(jsonData, null, 2))
      
      console.log('\n=== Poppik Makeup Sponge Entries ===')
      jsonData.filter(ps => ps.productName.includes('Poppik')).forEach(ps => {
        console.log(`  - ${ps.productName} (${ps.sku}):`)
        console.log(`    Sold: ${ps.totalQtySold}, Revenue: ₹${ps.totalRevenue}`)
      })
    } catch (e) {
      console.log('Raw data:', data)
    }
  })
})

req.on('error', (e) => {
  console.error('Request error:', e)
})

req.end()