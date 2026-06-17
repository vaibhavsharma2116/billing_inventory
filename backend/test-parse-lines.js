// Test lines from the PDF
const lines = [
  'POPPIK LIFESTYLE PVT LTD',
  'Pan No AAQCP0247B GSTIN 27AAQCP0247B1ZK',
  '8655324379 \taccount@poppik.in',
  '213 Sky Lark sector 11 belapur Thane , Thane, Maharashtra, 400614',
  'web: www.poppiklifestyle.com',
  'Invoice No.',
  'PL/SL/26-27/10',
  'Invoice Date',
  '11/06/2026',
  'Due Date',
  '11/07/2026',
  'Bill To',
  'PREMPAN CHEMVET PHARMA',
  'Shop No.10, Amrutkalash Building, Amba Mata Mandir',
  'Road, Pune, Pune, Maharashtra, Pune, Maharashtra,',
  '411041',
  'Mobile 9822022099',
  'GSTIN 27ABAPO1274B1Z3',
  'PAN Number ABAPO1274B',
  'Place of Supply Maharashtra',
  'Ship To',
  'PREMPAN CHEMVET PHARMA',
  'Shop No.10, Amrutkalash Building, Amba Mata Mandir',
  'Road, Pune, Pune, Maharashtra, Pune, Maharashtra,',
  '411041',
  'No Items \tHSN No. \tQty. \tMRP \tRate \tTax \tTotal',
  '1 CTU \t- \t61 PCS \t- \t0 \t0',
  '(0%)',
  '0',
  '2 Poppik Makeup Fixer Spray \t33041000 1040 PCS \t325',
  '(64.41% OFF)',
  '115.67 \t21,653.33',
  '(18%)',
  '1,41,949.6',
  '3 Poppik Makeup Sponge \t33041000 \t300 PCS \t299',
  '(64.41% OFF)',
  '106.42 \t5,746.88',
  '(18%)',
  '37,674',
  'SUBTOTAL \t1401 \tΓé╣ 27,400.21 \tΓé╣ 1,79,623.6',
  'Terms & Conditions',
  '1. Goods once sold will not be taken back or exchanged',
  '2. All disputes are subject to [ENTER_YOUR_CITY_NAME]',
  'jurisdiction only',
  'Taxable Amount \tΓé╣ 1,52,223.39',
  'CGST @9% \tΓé╣ 13,700.11',
  'SGST @9% \tΓé╣ 13,700.11',
  'Total Amount \tΓé╣ 1,79,623.6',
  'Received Amount \tΓé╣ 0',
  'Total Amount (in words)',
  'One Lakh Seventy Nine Thousand Six Hundred Twenty Three',
  'Rupees and Sixty Paise',
  'TAX INVOICE',
  'ORIGINAL FOR RECIPIENT',
  '-- 1 of 1 --'
]

// Find header row
let headerRowIndex = -1
const headerPatterns = [
  ['no', 'items', 'hsn', 'qty'],
  ['item', 'product', 'hsn', 'quantity'],
  ['sl', 'description', 'hsn', 'qty'],
  ['serial', 'product', 'hsn', 'rate'],
  ['no', 'items', 'hsn no', 'qty'],
  ['no', 'items', 'hsn no.', 'qty.'],
]

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].toLowerCase()
  for (const pattern of headerPatterns) {
    const matches = pattern.filter(keyword => line.includes(keyword)).length
    if (matches >= 3) {
      headerRowIndex = i
      break
    }
  }
  if (headerRowIndex !== -1) break
}

console.log('headerRowIndex:', headerRowIndex)

if (headerRowIndex !== -1) {
  let tempItems = []
  let currentItem = null
  let pastItems = false
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    console.log('Processing line:', line)
    
    // Stop processing once we hit subtotal or total
    if (line.toLowerCase().includes('subtotal') || line.toLowerCase().includes('total')) {
      pastItems = true
    }
    if (pastItems) {
      continue
    }
    
    // Skip if line looks like a footer or not relevant
    if (line.toLowerCase().includes('terms') ||
        line.toLowerCase().includes('received') ||
        line.toLowerCase().includes('invoice') ||
        line.toLowerCase().includes('original') ||
        line.length < 3) {
      continue
    }
    
    // Check if this is a new item line (starts with a number)
    const newItemMatch = line.match(/^(\d+)\s+(.*)/)
    if (newItemMatch) {
      // Save previous item if exists
      if (currentItem && currentItem.productName) {
        tempItems.push(currentItem)
      }
      
      // Start new item
      const itemNumber = newItemMatch[1]
      const restOfLine = newItemMatch[2]
      
      // Extract quantity
      let quantity = 1
      const qtyMatch = restOfLine.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i)
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1])
      }
      
      // Extract HSN
      let hsn = ''
      const hsnMatch = restOfLine.match(/(\d{6,8})/)
      if (hsnMatch) {
        hsn = hsnMatch[1]
      }
      
      // Extract rate
      let costPrice = 0
      
      // Extract product name
      let productName = restOfLine
        .replace(/\d/g, '')
        .replace(/[₹$€%,\-–()\.\/\t]/g, '')
        .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '')
        .trim()
      
      productName = productName.replace(/\s{2,}/g, ' ').trim()
      
      currentItem = {
        productName,
        sku: '',
        hsn,
        batchNo: '',
        expiryDate: null,
        costPrice,
        gstPercentage: 0,
        quantity
      }
    } else if (currentItem) {
      // This is a continuation line of the current item
      // Check if this line has rate or tax info
      const rateMatch = line.match(/([\d,]+\.\d{2})/)
      if (rateMatch) {
        currentItem.costPrice = parseFloat(rateMatch[1].replace(/,/g, ''))
      }
      const gstMatch = line.match(/(\d+)\s*%/)
      if (gstMatch) {
        currentItem.gstPercentage = parseFloat(gstMatch[1])
      }
      
      // Also check if it has product name needs to be extended
      const moreName = line
        .replace(/\d/g, '')
        .replace(/[₹$€%,\-–()\.\/\t]/g, '')
        .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '')
        .trim()
      if (moreName.length > 0) {
        currentItem.productName += ' ' + moreName
        currentItem.productName = currentItem.productName.replace(/\s{2,}/g, ' ').trim()
      }
    }
  }
  
  // Add the last item if exists
  if (currentItem && currentItem.productName) {
    tempItems.push(currentItem)
  }
  
  console.log('Parsed items:', tempItems)
}
