const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const srs = await prisma.salesReturn.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { salesReturnItems: true }
  });
  console.log(JSON.stringify(srs, null, 2));
}

main().finally(() => prisma.$disconnect());
