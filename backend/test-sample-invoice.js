console.log('===== Testing with Realistic Invoice Text =====')

// Realistic invoice text
const testInvoiceText = `
ABC Traders
123 Main St, City
GSTIN: 27AAECF1234D1Z5

Invoice No: INV-2024-001
Date: 2024-01-15

Items          HSN Code    Qty    MRP    Rate    Amount
1              Lipstick    12345678 2    500.00  450.00  900.00
2              Lip Gloss   87654321 1    300.00  270.00  270.00
3              Nail Polish 34567890 3    150.00  135.00  405.00

Subtotal: 1575.00
CGST (9%): 141.75
SGST (9%): 141.75
Total Amount: 1858.50

Terms & Conditions:
1. Payment within 30 days
2. Goods once sold cannot be returned
`

const lines = testInvoiceText.split(/\r?\n/).filter(line => line.trim())

console.log('\n===== INDIVIDUAL LINES =====')
lines.forEach((line, index) => {
  console.log(`[${index}] ${line}`)
})

console.log('\n===== RUNNING STATE-MACHINE PARSER =====')

const tempItems = []
let tableHeaderFound = false
let lineCount = 0

for (const line of lines) {
  const trimmedLine = line.trim()
  const lowerLine = trimmedLine.toLowerCase()
  lineCount++
  
  console.log(`\n[${lineCount-1}] Processing: "${trimmedLine}"`)
  
  if (!tableHeaderFound) {
    console.log('  - tableHeaderFound is false, checking for headers...')
    const hasHeaderKeywords = 
      lowerLine.includes('items') ||
      lowerLine.includes('hsn') ||
      lowerLine.includes('qty') ||
      lowerLine.includes('mrp') ||
      lowerLine.includes('rate') ||
      lowerLine.includes('product') ||
      lowerLine.includes('description') ||
      lowerLine.includes('item')
    
    if (hasHeaderKeywords) {
      tableHeaderFound = true
      console.log('  ✅ Table header found! Starting to parse items.')
    } else {
      const looksLikeProductRow = 
        /^(\d+)\s+/.test(trimmedLine) && // starts with number
        /[\d,]+(\.\d{1,2})?/.test(trimmedLine) // has at least one number
      if (looksLikeProductRow) {
        tableHeaderFound = true
        console.log('  ✅ Line looks like product row, starting product parsing')
      }
    }
    if (!tableHeaderFound) {
      console.log('  ⏭️ Skipping (no header yet)')
      continue
    }
  }
  
  console.log('  ✅ tableHeaderFound is true')
  
  const isFooter = 
    lowerLine.includes('subtotal') ||
    lowerLine.includes('terms') ||
    lowerLine.includes('taxable') ||
    lowerLine.includes('total amount') ||
    lowerLine.includes('grand total') ||
    lowerLine.includes('in words')
  
  if (isFooter) {
    console.log('  🛑 Footer found, stopping parsing!')
    break
  }
  
  console.log('  🔍 Checking if line starts with serial number...')
  const serialMatch = trimmedLine.match(/^(\d+)\s+/)
  if (!serialMatch) {
    console.log('  ❌ No serial number found, skipping')
    continue
  }
  console.log('  ✅ Found serial number')
  
  let tokens = trimmedLine.split(/\s+/).filter(t => t)
  console.log('  Tokens:', tokens)
  
  let numericTokens = []
  let nonNumericTokens = []
  let serialNumber = null
  
  if (tokens.length > 0 && /^\d+$/.test(tokens[0])) {
    serialNumber = parseInt(tokens[0])
    tokens = tokens.slice(1)
    console.log('  Extracted serial number:', serialNumber)
  } else {
    console.log('  ❌ No valid serial number in first token, skipping')
    continue
  }
  
  while (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1]
    const isNumeric = /^[₹$€]?[\d,]+\.?\d*%?$/.test(lastToken) || /^\d+(\.\d+)?(pcs|pcs\.|nos|no\.|qty)?$/i.test(lastToken)
    if (isNumeric) {
      numericTokens.unshift(tokens.pop())
      console.log('  Collected numeric token:', numericTokens[0])
    } else {
      break
    }
  }
  
  nonNumericTokens = tokens
  console.log('  Non-numeric tokens:', nonNumericTokens)
  console.log('  Numeric tokens:', numericTokens)
  
  let valid = true
  let totalAmount = null
  let taxPercentOrValue = null
  let discount = null
  let rate = null
  let mrp = null
  let qty = null
  let hsn = null
  
  let tempNumeric = [...numericTokens]
  
  for (let i = 0; i < tempNumeric.length; i++) {
    if (/^\d{6,8}$/.test(tempNumeric[i])) {
      hsn = tempNumeric[i]
      tempNumeric.splice(i, 1)
      console.log('  Extracted HSN from numeric tokens:', hsn)
      break
    }
  }
  
  tempNumeric.reverse()
  console.log('  Reversed tempNumeric:', tempNumeric)
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift()
    totalAmount = parseFloat(token.replace(/[₹$€%,]/g, ''))
    if (isNaN(totalAmount)) valid = false
    else console.log('  Extracted total amount:', totalAmount)
  } else valid = false
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift()
    rate = parseFloat(token.replace(/[₹$€%,]/g, ''))
    if (isNaN(rate)) {
      tempNumeric.unshift(token)
      rate = null
      console.log('  Rate token is not a number, pushed back')
    } else console.log('  Extracted rate:', rate)
  }
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift()
    mrp = parseFloat(token.replace(/[₹$€%,]/g, ''))
    if (isNaN(mrp)) {
      tempNumeric.unshift(token)
      mrp = null
      console.log('  MRP token is not a number, pushed back')
    } else console.log('  Extracted MRP:', mrp)
  }
  
  if (tempNumeric.length > 0) {
    const token = tempNumeric.shift()
    const qtyMatch = token.match(/^(\d+)/)
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1])
      console.log('  Extracted qty:', qty)
    } else qty = 1
  } else qty = 1
  
  if (tempNumeric.length > 0) {
    taxPercentOrValue = tempNumeric.shift()
    console.log('  Extracted tax/discount:', taxPercentOrValue)
  }
  if (tempNumeric.length > 0) {
    discount = tempNumeric.shift()
    console.log('  Extracted discount:', discount)
  }
  
  if (!hsn) {
    for (let i = 0; i < nonNumericTokens.length; i++) {
      if (/^\d{6,8}$/.test(nonNumericTokens[i])) {
        hsn = nonNumericTokens[i]
        nonNumericTokens.splice(i, 1)
        console.log('  Found HSN in non-numeric tokens:', hsn)
        break
      }
    }
  }
  
  if (!valid) {
    console.log('  ❌ Line failed validation, skipping')
    continue
  }
  
  const productName = nonNumericTokens.join(' ').trim()
  console.log('  Product name:', productName)
  
  let costPrice = rate || mrp || totalAmount / (qty || 1)
  let gstPercentage = 0
  
  if (taxPercentOrValue) {
    const gstMatch = taxPercentOrValue.match(/(\d+)%?/)
    if (gstMatch) {
      gstPercentage = parseInt(gstMatch[1])
    }
  }
  
  if (productName && productName.length >= 1 && qty > 0) {
    tempItems.push({
      productName,
      sku: '',
      hsn: hsn || '',
      batchNo: '',
      expiryDate: null,
      costPrice: isNaN(costPrice) ? 0 : costPrice,
      gstPercentage: isNaN(gstPercentage) ? 0 : gstPercentage,
      quantity: qty || 1
    })
    console.log('  ✅ Added product to items!')
  } else {
    console.log('  ❌ Invalid product, not added')
  }
}

console.log('\n===== FINAL ITEMS =====')
console.log(JSON.stringify(tempItems, null, 2))

if (tempItems.length === 0) {
  console.log('\n❌ No items found!')
} else {
  console.log(`\n✅ Found ${tempItems.length} items!`)
}
