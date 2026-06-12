const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDB() {
  try {
    const products = await prisma.product.findMany()
    console.log('=== All Products ===')
    console.log(JSON.stringify(products, null, 2))

    const csaId = 'cmpz8fs9i0001izqrwp4h857p' 
    const csaProducts = await prisma.product.findMany({
      where: { csaId }
    })
    console.log('\n=== CSA Products (csaId: ' + csaId + ') ===')
    console.log(JSON.stringify(csaProducts, null, 2))

    const csaPurchaseLedgers = await prisma.purchaseLedger.findMany({
      where: { csaId },
      include: { purchaseItems: true }
    })
    console.log('\n=== CSA Purchase Ledgers ===')
    console.log(JSON.stringify(csaPurchaseLedgers, null, 2))

    const users = await prisma.user.findMany()
    console.log('\n=== Users ===')
    console.log(JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('Error querying DB:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDB()
