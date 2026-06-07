const prisma = require('./src/lib/prisma')

async function updateProducts() {
  try {
    // Get all products first
    const products = await prisma.product.findMany()
    console.log('Found products:', products.length)

    for (const product of products) {
      let hsn
      if (product.sku === 'ORS-001') hsn = '3004'
      else if (product.sku === 'PAR-001') hsn = '300490'
      else if (product.sku === 'VIT-001') hsn = '210690'

      if (hsn) {
        await prisma.product.update({
          where: { id: product.id },
          data: { hsn }
        })
        console.log(`✅ Updated ${product.name} (${product.sku}) HSN to ${hsn}`)
      }
    }

    console.log('\n🎉 All products updated!')

  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

updateProducts()
