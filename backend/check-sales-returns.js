const prisma = require('./src/lib/prisma')

async function checkSalesReturns() {
  try {
    console.log('=== SALES RETURNS ===')
    const salesReturns = await prisma.salesReturn.findMany({
      include: { party: true }
    })
    salesReturns.forEach(sr => {
      console.log(`ID: ${sr.id}, Return No: ${sr.returnNo}, Date: ${sr.date}, Date ISO: ${sr.date.toISOString()}`)
    })
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

checkSalesReturns()
