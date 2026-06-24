const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
  const data = fs.readFileSync('backend/liv1.pdf');
  const raw = await pdfParse(data);
  let rawText = raw.text;
  
  // Replace newlines inside an item row.
  // The structure: (No) (Item Name) (HSN) (Qty PCS) (MRP) \n (Discount) \n (Rate) (TaxAmt) \n (TaxPct) \n (Total)
  // Let's strip all newlines that happen after " PCS" and before the end of the item row.
  // Or simpler: replace all newlines with spaces and then use a simpler regex?
  // But wait, "2Poppik Makeup Fixer Spray330410001040" doesn't have spaces!
  // "Spray330410001040 PCS" is "Spray" + "33041000" + "1040" + " PCS".
  
  console.log(rawText);
}
test().catch(console.error);
