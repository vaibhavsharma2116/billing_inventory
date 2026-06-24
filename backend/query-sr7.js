const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sr = await prisma.salesReturn.findFirst({
    where: { returnNo: 'SR-7' },
    include: { salesReturnItems: true }
  });
  console.log(JSON.stringify(sr, null, 2));
}

main().finally(() => prisma.$disconnect());
