
const prisma = require('./src/lib/prisma');

async function testEndpoint() {
  const distributorId = "cmphxbzri0000wknitv6yl1je";
  const startDateParam = "2026-06-02";
  const endDateParam = "2026-06-02";
  
  console.log('=== TESTING ENDPOINT ===');
  console.log('Distributor ID:', distributorId);
  console.log('Start date:', startDateParam);
  console.log('End date:', endDateParam);
  
  const whereDateRange = {};
  if (startDateParam) {
    const start = new Date(startDateParam);
    start.setHours(0, 0, 0, 0);
    whereDateRange.gte = start;
  }
  if (endDateParam) {
    const end = new Date(endDateParam);
    end.setHours(23, 59, 59, 999);
    whereDateRange.lte = end;
  }
  console.log('whereDateRange:', whereDateRange);
  console.log('Start ISO:', whereDateRange.gte?.toISOString());
  console.log('End ISO:', whereDateRange.lte?.toISOString());
  
  console.log('\n=== ALL SALES RETURNS ===');
  const allSalesReturns = await prisma.salesReturn.findMany({ 
    where: { distributorId } 
  });
  console.log('Count:', allSalesReturns.length);
  allSalesReturns.forEach(sr => {
    console.log(`- ${sr.returnNo}: ${sr.date} (${sr.date.toISOString()})`);
    console.log(`  In range? ${sr.date >= whereDateRange.gte && sr.date <= whereDateRange.lte}`);
  });
  
  console.log('\n=== FILTERED SALES RETURNS ===');
  const filteredSalesReturns = await prisma.salesReturn.findMany({ 
    where: { 
      distributorId, 
      date: whereDateRange 
    } 
  });
  console.log('Count:', filteredSalesReturns.length);
  filteredSalesReturns.forEach(sr => {
    console.log(`- ${sr.returnNo}: ${sr.date}`);
  });
  
  await prisma.$disconnect();
}

testEndpoint();
