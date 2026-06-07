const prisma = require('./src/lib/prisma')

async function checkProducts() {
  try {
    const distributors = await prisma.distributor.findMany()
    console.log('Distributors found:', distributors.length)

    for (const dist of distributors) {
      console.log(`\n--- Distributor: ${dist.companyName} ---`)
      const products = await prisma.product.findMany({
        where: { distributorId: dist.id }
      })
      console.log(`Products count: ${products.length}`)
      products.forEach((p, i) => {
        console.log(`  Product ${i + 1}:`)
        console.log(`    Name: ${p.name}`)
        console.log(`    HSN: ${p.hsn} (type: ${typeof p.hsn})`)
        console.log(`    SKU: ${p.sku}`)
        console.log(`    Stock: ${p.currentStock}`)
      })
    }

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

checkProducts()
