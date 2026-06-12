
require('dotenv').config()
console.log('=== Current Environment Variables ===')
console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('\n')

// Also check Prisma's default behavior
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
console.log('=== Prisma Client Initialized ===')
console.log('Prisma Client configured to connect to:', prisma._engineConfig?.datasources?.db?.url || 'Could not get URL')

async function testConnection() {
  try {
    console.log('\nTesting database connection...')
    const distributors = await prisma.distributor.findMany({ take: 2 })
    console.log(`✅ Connected successfully! Found ${distributors.length} distributors.`)
    distributors.forEach(d => console.log('- Distributor:', d.companyName))
  } catch (err) {
    console.error('❌ Connection error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
