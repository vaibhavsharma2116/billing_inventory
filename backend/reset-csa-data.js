const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetData() {
  try {
    const csaId = 'cmpz8fs9i0001izqrwp4h857p' // Bihari's CSA ID
    
    console.log('Deleting purchase items...')
    await prisma.purchaseItem.deleteMany({
      where: { csaId }
    })
    
    console.log('Deleting purchase ledgers...')
    await prisma.purchaseLedger.deleteMany({
      where: { csaId }
    })
    
    console.log('Deleting products...')
    await prisma.product.deleteMany({
      where: { csaId }
    })
    
    console.log('✅ Data reset successfully!')
  } catch (error) {
    console.error('Error resetting data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetData()
