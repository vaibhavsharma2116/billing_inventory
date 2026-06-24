
const pdfParse = require('pdf-parse');
const fs = require('fs');

async function parseInvoice(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  const rawLines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const products = [];
  let tableStarted = false;
  let currentProduct = null;
  
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lowerLine = line.toLowerCase();
    
    // Stop condition
    if (tableStarted && (lowerLine.includes('subtotal') || lowerLine.includes('terms') || lowerLine.includes('taxable') || lowerLine.includes('total amount'))) {
      if (currentProduct) {
        products.push(currentProduct);
      }
      break;
    }
    
    // Start condition
    if (!tableStarted) {
      if (lowerLine.replace(/\s+/g, '').includes('noitemshsnno')) {
        tableStarted = true;
        continue;
      }
      continue;
    }
    
    // Check for new product row (starts with serial number, possibly glued to name)
    const newProductMatch = line.match(/^(\d+)(.*)/);
    if (newProductMatch) {
      if (currentProduct) {
        products.push(currentProduct);
      }
      currentProduct = {
        srNo: parseInt(newProductMatch[1]),
        productName: newProductMatch[2].trim(),
        hsn: '',
        qty: 1,
        mrp: 0,
        rate: 0,
        tax: '18%',
        total: 0,
        extraTokens: []
      };
      continue;
    }
    
    // If we have a current product, process the line as its data
    if (currentProduct) {
      const numberMatches = line.match(/[\d,.]+/g) || [];
      
      // Handle glued HSN+Qty+MRP
      for (const token of numberMatches) {
        if (token.startsWith('33041000') && token.length > 8) {
          currentProduct.hsn = '33041000';
          const qtyMatch = token.substring(8).match(/(\d+)/);
          if (qtyMatch) {
            currentProduct.qty = parseInt(qtyMatch[1]);
          }
        } else if (token.length === 8) {
          currentProduct.hsn = token;
        } else {
          currentProduct.extraTokens.push(token);
        }
      }
      
      // Also collect non-number tokens as possible product name parts
      const nonNumberParts = line.split(/[\d,.]+/).filter(p => p.trim().length > 0);
      for (const part of nonNumberParts) {
        if (!part.toLowerCase().includes('pcs')) {
          currentProduct.productName += ' ' + part.trim();
        } else {
          // Extract qty from PCS token
          const qtyMatch = part.match(/(\d+)/);
          if (qtyMatch) {
            currentProduct.qty = parseInt(qtyMatch[1]);
          }
        }
      }
    }
  }
  
  // Add last product
  if (currentProduct) {
    products.push(currentProduct);
  }
  
  // Now apply right-to-left token mapping to each product
  const finalItems = products.map(product => {
    const tokens = product.extraTokens;
    let total = 0;
    let tax = product.tax;
    let discount = 0;
    let rate = 0;
    let mrp = 0;
    
    // Right-to-left extraction
    if (tokens.length >= 1) {
      total = parseFloat(tokens[tokens.length - 1].replace(/,/g, ''));
    }
    if (tokens.length >= 3) {
      rate = parseFloat(tokens[tokens.length - 3].replace(/,/g, ''));
    }
    if (tokens.length >= 4) {
      mrp = parseFloat(tokens[tokens.length - 4].replace(/,/g, ''));
    }
    
    return {
      srNo: product.srNo,
      productName: product.productName.trim(),
      hsn: product.hsn,
      qty: product.qty,
      mrp: mrp || 0,
      rate: rate || total / product.qty,
      tax: product.tax,
      total: total
    };
  });
  
  return {
    success: true,
    count: finalItems.length,
    items: finalItems
  };
}

// Usage: node gst-parser.js <pdf-file-path>
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a PDF file path');
    process.exit(1);
  }
  parseInvoice(filePath).then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}

module.exports = { parseInvoice };
