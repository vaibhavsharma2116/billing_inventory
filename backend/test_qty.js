const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.purchaseItem.findMany({ where: { purchaseId: 'cmqrxm4r00000rou5ojepquf0' }, take: 5 });
  console.log('Items qty:', items.map(i => i.qty));
}
main().catch(console.error).finally(() => prisma.$disconnect());
