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

    // Test new state-machine parsing logic
    const tempItems = [];
    let tableHeaderFound = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();
      
      if (!tableHeaderFound) {
        const hasHeaderKeywords = 
          lowerLine.includes('items') ||
          lowerLine.includes('hsn') ||
          lowerLine.includes('qty') ||
          lowerLine.includes('mrp') ||
          lowerLine.includes('rate');
        
        if (hasHeaderKeywords) {
          tableHeaderFound = true;
          console.log('\nTable header found, starting product parsing');
        }
        continue;
      }
      
      const isFooter = 
        lowerLine.includes('subtotal') ||
        lowerLine.includes('terms') ||
        lowerLine.includes('taxable') ||
        lowerLine.includes('total amount') ||
        lowerLine.includes('grand total') ||
        lowerLine.includes('in words');
      
      if (isFooter) {
        console.log('\nFooter found, stopping product parsing');
        break;
      }
      
      console.log('\nProcessing table line:', trimmedLine);
      
      const serialMatch = trimmedLine.match(/^(\d+)\s+/);
      if (!serialMatch) continue;
      
      let tokens = trimmedLine.split(/\s+/).filter(t => t);
      
      let valid = true;
      let totalAmount = null;
      let taxPercentOrValue = null;
      let discount = null;
      let rate = null;
      let mrp = null;
      let qty = null;
      let hsn = null;
      let productNameParts = [];
      
      let tempTokens = [...tokens];
      
      if (tempTokens.length > 0) {
        const lastToken = tempTokens.pop();
        totalAmount = parseFloat(lastToken.replace(/,/g, ''));
        if (isNaN(totalAmount)) valid = false;
      } else valid = false;
      
      if (tempTokens.length > 0) {
        taxPercentOrValue = tempTokens.pop();
      }
      
      if (tempTokens.length > 0) {
        discount = tempTokens.pop();
      }
      
      if (tempTokens.length > 0) {
        const rateToken = tempTokens.pop();
        rate = parseFloat(rateToken.replace(/,/g, ''));
        if (isNaN(rate)) {
          tempTokens.push(rateToken);
          rate = null;
        }
      }
      
      if (tempTokens.length > 0) {
        const mrpToken = tempTokens.pop();
        mrp = parseFloat(mrpToken.replace(/,/g, ''));
        if (isNaN(mrp)) {
          tempTokens.push(mrpToken);
          mrp = null;
        }
      }
      
      if (tempTokens.length > 0) {
        let qtyToken = tempTokens.pop();
        const qtyMatch = qtyToken.match(/^(\d+)/);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1]);
        } else {
          if (tempTokens.length > 0) {
            const possibleQtyToken = tempTokens.pop();
            const possibleQtyMatch = possibleQtyToken.match(/^(\d+)/);
            if (possibleQtyMatch) {
              qty = parseInt(possibleQtyMatch[1]);
            } else {
              tempTokens.push(possibleQtyToken);
              valid = false;
            }
          } else {
            valid = false;
          }
        }
      } else valid = false;
      
      if (tempTokens.length > 0) {
        const hsnToken = tempTokens.pop();
        if (/^\d{6,8}$/.test(hsnToken)) {
          hsn = hsnToken;
        } else {
          tempTokens.push(hsnToken);
        }
      }
      
      if (tempTokens.length > 0) {
        tempTokens.shift();
        productNameParts = tempTokens;
      }
      
      if (!valid) {
        console.log('Line failed validation, skipping');
        continue;
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
      
      console.log('Successfully parsed item:', { productName, hsn, qty, costPrice, gstPercentage, totalAmount });
      
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

// Create a test PDF text to verify the logic
console.log('=== TESTING WITH SAMPLE TEXT ===');
const testText = `
Company Name
213 Sky Lark sector 11 belapur...
Invoice No: 1234

Items    HSN No.    Qty    MRP    Rate    Total
1    Lipstick 12345678    2    500.00    450.00    900.00
2    Lip Gloss 87654321    1    300.00    270.00    270.00

Subtotal: 1170.00
Terms & Conditions: ...
`;

// Save test text to a temporary PDF (we'll just simulate parsing)
console.log('Test text:', testText);

// Now test the parsing logic on the test text directly
const lines = testText.split(/\r?\n/).filter(line => line.trim());
console.log('\nTest lines:', lines);

const tempItems = [];
let tableHeaderFound = false;

for (const line of lines) {
  const trimmedLine = line.trim();
  const lowerLine = trimmedLine.toLowerCase();
  
  if (!tableHeaderFound) {
    const hasHeaderKeywords = 
      lowerLine.includes('items') ||
      lowerLine.includes('hsn') ||
      lowerLine.includes('qty') ||
      lowerLine.includes('mrp') ||
      lowerLine.includes('rate');
    
    if (hasHeaderKeywords) {
      tableHeaderFound = true;
      console.log('\nTable header found, starting product parsing');
    }
    continue;
  }
  
  const isFooter = 
    lowerLine.includes('subtotal') ||
    lowerLine.includes('terms') ||
    lowerLine.includes('taxable') ||
    lowerLine.includes('total amount') ||
    lowerLine.includes('grand total') ||
    lowerLine.includes('in words');
  
  if (isFooter) {
    console.log('\nFooter found, stopping product parsing');
    break;
  }
  
  console.log('\nProcessing table line:', trimmedLine);
  
  const serialMatch = trimmedLine.match(/^(\d+)\s+/);
  if (!serialMatch) continue;
  
  let tokens = trimmedLine.split(/\s+/).filter(t => t);
  
  let valid = true;
  let totalAmount = null;
  let taxPercentOrValue = null;
  let discount = null;
  let rate = null;
  let mrp = null;
  let qty = null;
  let hsn = null;
  let productNameParts = [];
  
  let tempTokens = [...tokens];
  
  if (tempTokens.length > 0) {
    const lastToken = tempTokens.pop();
    totalAmount = parseFloat(lastToken.replace(/,/g, ''));
    if (isNaN(totalAmount)) valid = false;
  } else valid = false;
  
  if (tempTokens.length > 0) {
    taxPercentOrValue = tempTokens.pop();
  }
  
  if (tempTokens.length > 0) {
    discount = tempTokens.pop();
  }
  
  if (tempTokens.length > 0) {
    const rateToken = tempTokens.pop();
    rate = parseFloat(rateToken.replace(/,/g, ''));
    if (isNaN(rate)) {
      tempTokens.push(rateToken);
      rate = null;
    }
  }
  
  if (tempTokens.length > 0) {
    const mrpToken = tempTokens.pop();
    mrp = parseFloat(mrpToken.replace(/,/g, ''));
    if (isNaN(mrp)) {
      tempTokens.push(mrpToken);
      mrp = null;
    }
  }
  
  if (tempTokens.length > 0) {
    let qtyToken = tempTokens.pop();
    const qtyMatch = qtyToken.match(/^(\d+)/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]);
    } else {
      if (tempTokens.length > 0) {
        const possibleQtyToken = tempTokens.pop();
        const possibleQtyMatch = possibleQtyToken.match(/^(\d+)/);
        if (possibleQtyMatch) {
          qty = parseInt(possibleQtyMatch[1]);
        } else {
          tempTokens.push(possibleQtyToken);
          valid = false;
        }
      } else {
        valid = false;
      }
    }
  } else valid = false;
  
  if (tempTokens.length > 0) {
    const hsnToken = tempTokens.pop();
    if (/^\d{6,8}$/.test(hsnToken)) {
      hsn = hsnToken;
    } else {
      tempTokens.push(hsnToken);
    }
  }
  
  if (tempTokens.length > 0) {
    tempTokens.shift();
    productNameParts = tempTokens;
  }
  
  if (!valid) {
    console.log('Line failed validation, skipping');
    continue;
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
  
  console.log('Successfully parsed item:', { productName, hsn, qty, costPrice, gstPercentage, totalAmount });
  
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

console.log('\n=== FINAL ITEMS FROM TEST TEXT ===');
console.log(tempItems);
