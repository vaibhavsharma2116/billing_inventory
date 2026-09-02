const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all products...');
  
  // 1. Group products by csaId OR distributorId, AND exactly matching lowercased name
  const allProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' } // Oldest first
  });
  
  const groups = {};
  
  allProducts.forEach(p => {
    const key = `${p.distributorId || ''}-${p.csaId || ''}-${p.name.trim().toLowerCase()}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });
  
  let mergedCount = 0;
  let deletedCount = 0;
  
  for (const key of Object.keys(groups)) {
    const productsInGroup = groups[key];
    if (productsInGroup.length > 1) {
      mergedCount++;
      const primary = productsInGroup[0]; // oldest is primary
      const duplicates = productsInGroup.slice(1);
      
      console.log(`\nMerging ${duplicates.length} duplicates into primary product "${primary.name}" (${primary.id})`);
      
      let totalStockToAdd = 0;
      const duplicateIds = duplicates.map(d => d.id);
      
      for (const dup of duplicates) {
        totalStockToAdd += dup.currentStock;
      }
      
      // Update foreign keys using a transaction
      await prisma.$transaction(async (tx) => {
        // Re-link InvoiceItems
        await tx.invoiceItem.updateMany({
          where: { productId: { in: duplicateIds } },
          data: { productId: primary.id }
        });
        
        // Re-link PurchaseItems
        await tx.purchaseItem.updateMany({
          where: { productId: { in: duplicateIds } },
          data: { productId: primary.id }
        });
        
        // Re-link SalesReturnItems
        await tx.salesReturnItem.updateMany({
          where: { productId: { in: duplicateIds } },
          data: { productId: primary.id }
        });
        
        // Re-link PurchaseReturnItems
        await tx.purchaseReturnItem.updateMany({
          where: { productId: { in: duplicateIds } },
          data: { productId: primary.id }
        });
        
        // Add stock to primary
        if (totalStockToAdd > 0) {
          await tx.product.update({
            where: { id: primary.id },
            data: { currentStock: { increment: totalStockToAdd } }
          });
        }
        
        // Delete duplicates
        await tx.product.deleteMany({
          where: { id: { in: duplicateIds } }
        });
      });
      
      deletedCount += duplicateIds.length;
      console.log(`  -> Re-linked relations, added ${totalStockToAdd} stock, deleted ${duplicateIds.length} duplicates.`);
    }
  }
  
  console.log(`\n=== Migration Complete ===`);
  console.log(`Merged ${mergedCount} unique products.`);
  console.log(`Deleted ${deletedCount} duplicate entries.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
