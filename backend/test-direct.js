const prisma = require('./src/lib/prisma')

const getNum = (val) => {
  if (typeof val === 'number') return val
  if (val?.toNumber) return val.toNumber()
  return parseFloat(val)
}

async function testProductSales() {
  // Pick a CSA user with distributors
  const csaId = 'cmpz8fs9i0001izqrwp4h857p'
  console.log('CSA ID:', csaId)
  
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = new Date()
  console.log('Date range:', start, end)
  
  console.log('Finding distributors for CSA:', csaId)
  const distributorIds = (await prisma.distributor.findMany({
    where: { csaId },
    select: { id: true }
  })).map(d => d.id)
  
  console.log('Distributor IDs:', distributorIds)
  
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: {
        distributorId: { in: distributorIds },
        date: { gte: start, lte: end }
      }
    },
    include: { product: true, invoice: true }
  })
  
  console.log('Found', invoiceItems.length, 'invoice items!')
  
  const productMap = new Map()
  invoiceItems.forEach(item => {
    const key = item.productId
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: item.productId,
        productName: item.product?.name || 'Unknown',
        sku: item.product?.sku || '',
        totalQtySold: 0,
        totalRevenue: 0,
        totalCost: 0
      })
    }
    const existing = productMap.get(key)
    existing.totalQtySold += item.qty
    existing.totalRevenue += getNum(item.total)
    if (item.product?.costPrice) {
      existing.totalCost += item.qty * getNum(item.product.costPrice)
    }
  })
  
  const productSales = Array.from(productMap.values()).map(ps => ({
    ...ps,
    profitMargin: ps.totalRevenue > 0 ? ((ps.totalRevenue - ps.totalCost) / ps.totalRevenue * 100).toFixed(2) : 0
  })).sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  console.log('Final product sales report:')
  productSales.forEach((ps, i) => {
    console.log(`  ${i+1}) ${ps.productName} (${ps.sku}): ${ps.totalQtySold} sold for ₹${ps.totalRevenue}`)
  })
  
}

testProductSales()
  .then(() => prisma.$disconnect())
  .catch(err => console.error('ERROR:', err))
