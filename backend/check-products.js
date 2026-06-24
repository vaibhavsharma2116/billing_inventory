
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const distributors = await prisma.distributor.findMany({
    include: {
      products: true
    }
  })

  console.log('Total distributors:', distributors.length)
  distributors.forEach(d => {
    console.log(`Distributor ${d.id} (${d.companyName}) has ${d.products.length} products`)
    if (d.products.length > 0) {
      console.log('First product:', d.products[0])
    }
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
