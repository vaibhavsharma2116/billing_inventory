const prisma = require('./src/lib/prisma')

async function initializeFinancialData() {
  try {
    console.log('🔍 Starting financial data initialization...')

    // Step 1: Backfill InvoiceItem costPrice from Product costPrice
    console.log('\n📦 Backfilling InvoiceItem costPrice...')
    const invoiceItems = await prisma.invoiceItem.findMany({
      include: { product: true }
    })
    
    let updatedItems = 0
    for (const item of invoiceItems) {
      if (!item.costPrice && item.product?.costPrice) {
        await prisma.invoiceItem.update({
          where: { id: item.id },
          data: { costPrice: item.product.costPrice }
        })
        updatedItems++
      }
    }
    console.log(`✅ Updated ${updatedItems} InvoiceItems with costPrice`)

    // Step 2: Calculate and update Distributor financials
    console.log('\n💰 Calculating Distributor financials...')
    const distributors = await prisma.distributor.findMany({
      include: {
        products: true,
        invoices: { include: { invoiceItems: true } },
        purchaseLedgers: true
      }
    })

    for (const distributor of distributors) {
      // Calculate totalCompanyDebits: Sum of all purchase ledgers
      let totalCompanyDebits = 0
      distributor.purchaseLedgers.forEach(pl => {
        totalCompanyDebits += parseFloat(pl.totalAmount)
      })

      // Calculate totalAmountRealized: Sum of all invoice grand totals
      let totalAmountRealized = 0
      distributor.invoices.forEach(inv => {
        totalAmountRealized += parseFloat(inv.grandTotal)
      })

      // pendingCompanyBalance = totalCompanyDebits - totalAmountRealized
      const pendingCompanyBalance = totalCompanyDebits - totalAmountRealized

      console.log(`\n📊 ${distributor.companyName}:`)
      console.log(`  - Total Company Debits: ₹${totalCompanyDebits.toFixed(2)}`)
      console.log(`  - Total Amount Realized: ₹${totalAmountRealized.toFixed(2)}`)
      console.log(`  - Pending Company Balance: ₹${pendingCompanyBalance.toFixed(2)}`)

      await prisma.distributor.update({
        where: { id: distributor.id },
        data: {
          totalCompanyDebits,
          totalAmountRealized,
          pendingCompanyBalance
        }
      })
    }

    console.log('\n✅ Financial data initialization complete!')

  } catch (error) {
    console.error('❌ Error initializing financial data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initializeFinancialData()
