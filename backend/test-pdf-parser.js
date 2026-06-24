const pdfParse = require('pdf-parse');
const fs = require('fs');

// Test parsing logic (copied from csa.js)
function testParsePdf(filePath) {
  console.log('Testing PDF:', filePath);
  const dataBuffer = fs.readFileSync(filePath);
  
  pdfParse(dataBuffer).then(data => {
    console.log('\n=== FULL TEXT ===');
    console.log(data.text);

    const lines = data.text.split(/\r?\n/).filter(line => line.trim());
    console.log('\n=== LINES ===');
    console.log(lines);

    // Test new parsing logic
    const tempItems = [];

    // Define strict validation rules
    const skipKeywords = ['Terms', 'Goods', 'All disputes', 'Subtotal', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', 'Grand Total', 'Invoice', 'Bill', 'Date', 'Supplier'];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // First, skip lines containing any skip keywords
      let shouldSkip = false;
      for (const keyword of skipKeywords) {
        if (trimmedLine.toLowerCase().includes(keyword.toLowerCase())) {
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) continue;
      
      // Check if line starts with a valid serial number (digits only)
      const startsWithSerial = /^(\d+)\s+/.test(trimmedLine);
      if (!startsWithSerial) continue;
      
      // Check if line ends with a valid currency decimal amount (like 123.45 or 123,45)
      const endsWithCurrency = /[\d,.]+\d{2}$/.test(trimmedLine);
      if (!endsWithCurrency) continue;
      
      console.log('\nProcessing valid line:', trimmedLine);
      
      // Now parse line using RIGHT-TO-LEFT approach
      let tokens = trimmedLine.split(/\s+/).filter(t => t);
      
      // Extract fields from the end
      let totalAmount = null;
      let taxPercentOrValue = null;
      let discount = null;
      let rate = null;
      let mrp = null;
      let qty = null;
      let hsn = null;
      let productNameParts = [];
      
      // Step 1: Last token is Total Amount
      if (tokens.length > 0) {
        const lastToken = tokens.pop();
        totalAmount = parseFloat(lastToken.replace(/,/g, ''));
      }
      
      // Step 2: 2nd last is Tax value/percent
      if (tokens.length > 0) {
        const secondLast = tokens.pop();
        taxPercentOrValue = secondLast;
      }
      
      // Step 3: 3rd last is Discount
      if (tokens.length > 0) {
        const thirdLast = tokens.pop();
        discount = thirdLast;
      }
      
      // Step 4: 4th last is Rate
      if (tokens.length > 0) {
        const fourthLast = tokens.pop();
        rate = parseFloat(fourthLast.replace(/,/g, ''));
      }
      
      // Step 5: 5th last is MRP
      if (tokens.length > 0) {
        const fifthLast = tokens.pop();
        mrp = parseFloat(fifthLast.replace(/,/g, ''));
      }
      
      // Step 6: 6th last is Qty (may include "PCS", "NOS", etc.)
      if (tokens.length > 0) {
        let qtyPart = tokens.pop();
        let qtyMatch = qtyPart.match(/^(\d+)/);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1]);
        } else {
          // If qty part doesn't start with number, check previous token
          if (tokens.length > 0 && /^\d+$/.test(tokens[tokens.length - 1])) {
            qty = parseInt(tokens.pop());
          } else {
            qty = 1;
          }
        }
      }
      
      // Step 7: 7th last is HSN (usually 6-8 digits)
      if (tokens.length > 0) {
        let hsnPart = tokens.pop();
        if (/^\d{6,8}$/.test(hsnPart)) {
          hsn = hsnPart;
        } else {
          productNameParts.unshift(hsnPart);
        }
      }
      
      // Remaining tokens: first token is serial number, rest is product name
      if (tokens.length > 0) {
        tokens.shift();
        productNameParts = [...productNameParts, ...tokens];
      }
      
      const productName = productNameParts.join(' ').trim();
      
      let costPrice = rate || mrp || totalAmount / (qty || 1);
      let gstPercentage = 0;
      
      if (taxPercentOrValue) {
        const gstMatch = taxPercentOrValue.match(/(\d+)%?/);
        if (gstMatch) {
          gstPercentage = parseInt(gstMatch[1]);
        }
      }
      
      console.log('Parsed item:', { productName, hsn, qty, costPrice, gstPercentage, totalAmount });
      
      if (productName && productName.length > 2 && qty > 0) {
        tempItems.push({
          productName,
          sku: '',
          hsn: hsn || '',
          batchNo: '',
          expiryDate: null,
          costPrice: isNaN(costPrice) ? 0 : costPrice,
          gstPercentage: isNaN(gstPercentage) ? 0 : gstPercentage,
          quantity: qty || 1
        });
      }
    }
    
    console.log('\n=== FINAL ITEMS ===');
    console.log(tempItems);
  }).catch(err => {
    console.error('Error parsing PDF:', err);
  });
}

// Test with all sample PDFs
// testParsePdf('bill.pdf');
testParsePdf('ls.pdf');
testParsePdf('ll.pdf');
