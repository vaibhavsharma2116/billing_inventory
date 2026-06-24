const mockText = `Tax Invoice
Original For Recipient
Invoice No. INV-123
1 Poppik Mattepout Bullet Lipstick 33041000 10 276.00 81.15 0.00 146.07 (18%) 957.57
2 Glowing Face Serum 33049910 5 450.00 150.00 10.00 135.00 (18%) 885.00`;

const lines = mockText.split('\n');
let parsedProducts = [];

for (let line of lines) {
  if (line.match(/\b\d{8}\b/)) { // Contains HSN
    console.log("Processing line:", line);
    // Remove the starting item number if present
    line = line.replace(/^\d+\s+/, '');
    
    // Extract everything matching the pattern
    // Name HSN Qty MRP Rate Discount TaxAmount (TaxPct) Total
    const match = line.match(/(.*?)\s+(\d{8})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\(\d+%\)\s+([\d.]+)/);
    
    if (match) {
      parsedProducts.push({
        productName: match[1].trim(),
        hsn: match[2],
        qty: parseInt(match[3]),
        mrp: parseFloat(match[4]),
        rate: parseFloat(match[5]),
        discount: parseFloat(match[6]),
        taxAmount: parseFloat(match[7]),
        total: parseFloat(match[8])
      });
    } else {
        // sometimes discount is '-' or missing? The layout says it has all values
        console.log("No match for:", line);
    }
  }
}

console.log(parsedProducts);
