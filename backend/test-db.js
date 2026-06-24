const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking the latest purchase...');
  
  // Get the latest purchase
  const latestPurchase = await prisma.purchaseLedger.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      purchaseItems: {
        include: { product: true }
      }
    }
  });
  
  if (!latestPurchase) {
    console.log('❌ No purchases found!');
    return;
  }
  
  console.log('\n✅ Latest purchase found:', latestPurchase.id);
  console.log('📦 Purchase items:');
  latestPurchase.purchaseItems.forEach((item, index) => {
    console.log(`\nItem ${index + 1}:`);
    console.log('  Product:', item.product?.name);
    console.log('  Qty:', item.qty);
    console.log('  Rate:', item.rate?.toString());
    console.log('  Discount:', item.discount?.toString());
    console.log('  Total:', item.total?.toString());
    console.log('  GST %:', item.gstPercentage?.toString());
  });
  
  // Check the schema
  console.log('\n📋 Database schema fields for PurchaseItem:');
  console.log(Object.keys(prisma.purchaseItem.fields));
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
