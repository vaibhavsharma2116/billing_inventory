
console.log('=== DATE TEST ===');

// Simulate what happens when "today" is selected (startDate and endDate are both "2026-06-02")
const startDateParam = "2026-06-02";
const endDateParam = "2026-06-02";

console.log('Input params:', { startDateParam, endDateParam });

// Current code
let start = new Date(startDateParam);
start.setHours(0, 0, 0, 0);
let end = new Date(endDateParam);
end.setHours(23, 59, 59, 999);

console.log('Current code:');
console.log('  start:', start.toISOString(), 'Local:', start.toString());
console.log('  end:', end.toISOString(), 'Local:', end.toString());

// The actual sales return dates we have
const salesReturnDates = [
  new Date('2026-06-02T01:40:38.195Z'),
  new Date('2026-06-02T01:40:39.747Z'),
  new Date('2026-06-02T01:48:49.189Z'),
  new Date('2026-06-02T01:52:14.162Z')
];

console.log('\nSales return dates:');
salesReturnDates.forEach(d => {
  console.log(`  ISO: ${d.toISOString()}, Local: ${d.toString()}`);
  console.log(`  Is in range? ${d >= start && d <= end}`);
});

// Let's fix it - let's treat the dates as local dates properly!
console.log('\n=== FIXED VERSION ===');

function getLocalDateRange(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start, end };
}

const fixedRange = getLocalDateRange(startDateParam);
console.log('Fixed range:');
console.log('  start:', fixedRange.start.toISOString(), 'Local:', fixedRange.start.toString());
console.log('  end:', fixedRange.end.toISOString(), 'Local:', fixedRange.end.toString());

console.log('\nChecking sales returns with fixed range:');
salesReturnDates.forEach(d => {
  console.log(`  ISO: ${d.toISOString()}, Local: ${d.toString()}`);
  console.log(`  Is in range? ${d >= fixedRange.start && d <= fixedRange.end}`);
});
