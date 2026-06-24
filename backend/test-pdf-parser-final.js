const pdfParse = require('pdf-parse');
const fs = require('fs');

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
  
  let numericTokens = [];
  let nonNumericTokens = [];
  let serialNumber = null;
  
  if (tokens.length > 0 && /^\d+$/.test(tokens[0])) {
    serialNumber = parseInt(tokens[0]);
    tokens = tokens.slice(1);
  } else {
    continue;
  }
  
  while (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1];
    const isNumeric = /^[₹$€]?[\d,]+\.?\d*%?$/.test(lastToken);
    if (isNumeric) {
      numericTokens.unshift(tokens.pop());
    } else {
      break;
    }
  }
  
  nonNumericTokens = tokens;
  
  console.log('Tokens:', { serialNumber, nonNumericTokens, numericTokens });
  
  let valid = true;
  let totalAmount = null;
  let taxPercentOrValue = null;
  let discount = null;
  let rate = null;
  let mrp = null;
  let qty = null;
  let hsn = null;
  
  let tempNumeric = [...numericTokens];
  
  if (tempNumeric.length > 0 && /^\d{6,8}$/.test(tempNumeric[0])) {
    hsn = tempNumeric.shift();
  }
  
  tempNumeric.reverse();
  console.log('tempNumeric after reverse:', tempNumeric);
  
  // Now extract mandatory fields first: total, rate, mrp, qty
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift();
    totalAmount = parseFloat(token.replace(/[₹$€%,]/g, ''));
    console.log('totalAmount:', totalAmount, 'tempNumeric now:', tempNumeric);
    if (isNaN(totalAmount)) valid = false;
  } else valid = false;
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift();
    rate = parseFloat(token.replace(/[₹$€%,]/g, ''));
    console.log('rate:', rate, 'tempNumeric now:', tempNumeric);
    if (isNaN(rate)) {
      tempNumeric.unshift(token);
      rate = null;
    }
  }
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift();
    mrp = parseFloat(token.replace(/[₹$€%,]/g, ''));
    console.log('mrp:', mrp, 'tempNumeric now:', tempNumeric);
    if (isNaN(mrp)) {
      tempNumeric.unshift(token);
      mrp = null;
    }
  }
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift();
    const qtyMatch = token.match(/^(\d+)/);
    console.log('qty token:', token, 'qtyMatch:', qtyMatch, 'tempNumeric now:', tempNumeric);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]);
    } else {
      valid = false;
    }
  } else {
    console.log('tempNumeric is empty for qty, setting valid to false');
    valid = false;
  }
  
  // Now any remaining tokens are tax/discount (optional)
  if (tempNumeric.length > 0) {
    taxPercentOrValue = tempNumeric.shift();
    console.log('taxPercentOrValue:', taxPercentOrValue, 'tempNumeric now:', tempNumeric);
  }
  if (tempNumeric.length > 0) {
    discount = tempNumeric.shift();
    console.log('discount:', discount, 'tempNumeric now:', tempNumeric);
  }
  
  if (!hsn) {
    for (let i = 0; i < nonNumericTokens.length; i++) {
      if (/^\d{6,8}$/.test(nonNumericTokens[i])) {
        hsn = nonNumericTokens[i];
        nonNumericTokens.splice(i, 1);
        break;
      }
    }
  }
  
  console.log('Final values before valid check:', { valid, productName: nonNumericTokens.join(' '), hsn, qty, rate, mrp, totalAmount });
  
  if (!valid) {
    console.log('Line failed numeric validation, skipping');
    continue;
  }
  
  const productName = nonNumericTokens.join(' ').trim();
  
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
