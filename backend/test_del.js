const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const purchaseId = 'cmqrv7tm8006j1427pu1qfdiv'; // this has 2 items
  const existingPurchase = await prisma.purchaseLedger.findUnique({
    where: { id: purchaseId },
    include: { purchaseItems: true }
  });
  if (!existingPurchase) return console.log('Purchase not found');

  const beforeStock = [];
  for (const item of existingPurchase.purchaseItems) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    beforeStock.push({ id: item.productId, stock: product.currentStock });
  }
  console.log('Before stock:', beforeStock);

  try {
    await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of existingPurchase.purchaseItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (product) {
          const newStock = product.currentStock - item.qty
          if (newStock <= 0) {
            await tx.product.delete({ where: { id: item.productId } })
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: newStock }
            })
          }
        }
      }
      await tx.purchaseItem.deleteMany({ where: { purchaseId: purchaseId } })
      await tx.purchaseLedger.delete({ where: { id: purchaseId } })
    });
    console.log('Transaction succeeded!');
  } catch (err) {
    console.log('Transaction Error:', err.message);
  }

  const afterStock = [];
  for (const item of beforeStock) {
    const product = await prisma.product.findUnique({ where: { id: item.id } });
    afterStock.push({ id: item.id, stock: product ? product.currentStock : 'DELETED' });
  }
  console.log('After stock:', afterStock);
}
main().catch(console.error).finally(() => prisma.$disconnect());
