const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// For user "bihari" with userId "cmpz8fs9i0001izqrwp4h857p"
const token = jwt.sign(
  { 
    userId: 'cmpz8fs9i0001izqrwp4h857p',
    role: 'CSA' 
  }, 
  JWT_SECRET, 
  { expiresIn: '24h' }
)

console.log('Generated test token for CSA "bihari":')
console.log(token)
console.log('\nUse this in your browser\'s localStorage as "token"')