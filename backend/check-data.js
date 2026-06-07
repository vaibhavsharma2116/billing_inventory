
const prisma = require('./src/lib/prisma')

async function checkData() {
  try {
    console.log('Checking invoices...')
    const invoices = await prisma.invoice.findMany({ include: { party: true } })
    console.log('Invoices:', invoices)

    console.log('\nChecking claims...')
    const claims = await prisma.claim.findMany()
    console.log('Claims:', claims)
  } catch (error) {
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
