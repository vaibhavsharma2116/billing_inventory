const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  let updated = 0;
  for (const p of products) {
    const match = p.name.match(/^(\d+)(Poppik.*)/i);
    if (match) {
      const newName = match[2].trim();
      console.log(`Updating: ${p.name} -> ${newName}`);
      await prisma.product.update({
        where: { id: p.id },
        data: { name: newName }
      });
      updated++;
    } else if (/^\d+\s+[a-zA-Z]/.test(p.name)) {
      const newName = p.name.replace(/^\d+\s+/, '').trim();
      console.log(`Updating (spaced): ${p.name} -> ${newName}`);
      await prisma.product.update({
        where: { id: p.id },
        data: { name: newName }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} products`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
