const http = require('http')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/csa/my-reports/product-sales',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE' // We'll need a real token, but first let's test without auth by checking the backend code's auth middleware
  }
}

console.log('Calling API endpoint:', options.path)

const req = http.request(options, (res) => {
  console.log(`Response status: ${res.statusCode}`)
  console.log(`Response headers: ${JSON.stringify(res.headers)}`)
  
  let data = ''
  res.on('data', (chunk) => { data += chunk })
  
  res.on('end', () => {
    console.log('\nAPI response body:')
    console.log(data)
    
    try {
      const json = JSON.parse(data)
      console.log('\nParsed JSON (product sales):')
      json.forEach((ps, i) => {
        console.log(`${i+1}. ${ps.productName} (${ps.sku})`)
        console.log(`   Sold: ${ps.totalQtySold}, Revenue: ${ps.totalRevenue}`)
      })
    } catch (e) {
      console.error('Could not parse JSON:', e.message)
    }
  })
})

req.on('error', (e) => {
  console.error('Error calling API:', e.message)
})

req.end()