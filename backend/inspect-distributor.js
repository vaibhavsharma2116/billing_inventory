const prisma = require('./src/lib/prisma');
(async () => {
  const email = 'poppiklifestyle@gmail.com';
  const distributor = await prisma.distributor.findUnique({
    where: { email },
    select: { id: true, companyName: true, csaId: true }
  });
  console.log('distributor', distributor);
  if (!distributor) return;

  const invoices = await prisma.invoice.findMany({
    where: { distributorId: distributor.id },
    select: { id: true, invoiceNo: true, date: true, createdAt: true, grandTotal: true },
    orderBy: { date: 'asc' }
  });

  const salesReturns = await prisma.salesReturn.findMany({
    where: { distributorId: distributor.id },
    select: { id: true, returnNo: true, date: true, createdAt: true, grandTotal: true },
    orderBy: { date: 'asc' }
  });

  console.log('invoices count', invoices.length);
  const invoicesOnDate = invoices.filter(x => x.date && x.date.toISOString().slice(0, 10) === '2026-06-12');
  console.log(JSON.stringify(invoicesOnDate, null, 2));

  console.log('salesReturns count', salesReturns.length);
  const salesReturnsOnDate = salesReturns.filter(x => x.date && x.date.toISOString().slice(0, 10) === '2026-06-12');
  console.log(JSON.stringify(salesReturnsOnDate, null, 2));
})().catch(err => {
  console.error(err);
  process.exit(1);
});
