const pdfParse = require('pdf-parse')
const fs = require('fs')

console.log('===== PDF Parser Debug =====')
console.log('Usage: node debug-pdf.js <path-to-pdf>')
console.log()

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('❌ Please provide a PDF path!')
  console.error('Example: node debug-pdf.js bill.pdf')
  process.exit(1)
}

console.log('📄 Reading file:', pdfPath)

const dataBuffer = fs.readFileSync(pdfPath)

pdfParse(dataBuffer).then(data => {
  console.log('\n===== RAW PDF TEXT =====')
  console.log(data.text)

  const lines = data.text.split(/\r?\n/).filter(line => line.trim())
  console.log('\n===== INDIVIDUAL LINES =====')
  lines.forEach((line, index) => {
    console.log(`[${index}] ${line}`)
  })

  console.log('\n===== RUNNING STATE-MACHINE PARSER =====')
  
  // Copy of our parsing logic
  const tempItems = []
  let tableHeaderFound = false
  let lineCount = 0
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    const lowerLine = trimmedLine.toLowerCase()
    lineCount++
    
    console.log(`\n[${lineCount-1}] Processing: "${trimmedLine}"`)
    
    // Step 1: Check if we've found the table header yet
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
        if (lineCount >= 20) {
          const looksLikeProductRow = 
            /^(\d+)\s+/.test(trimmedLine) && // starts with number
            /[\d,]+\.\d{2}/.test(trimmedLine) // has at least one decimal number
          if (looksLikeProductRow) {
            tableHeaderFound = true
            console.log('  ✅ Fallback: line looks like product row! Starting to parse.')
          }
        }
        if (!tableHeaderFound) {
          console.log('  ⏭️ Skipping (no header yet)')
        }
      }
      continue
    }
    
    console.log('  ✅ tableHeaderFound is true')
    
    // Step 2: Check if we've reached the footer
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
    
    // Step 3: Now process the line!
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
      const isNumeric = /^[₹$€]?[\d,]+\.?\d*%?$/.test(lastToken)
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
    
    if (tempNumeric.length > 0 && /^\d{6,8}$/.test(tempNumeric[0])) {
      hsn = tempNumeric.shift()
      console.log('  Extracted HSN:', hsn)
    }
    
    tempNumeric.reverse()
    console.log('  Reversed numeric tokens:', tempNumeric)
    
    if (tempNumeric.length > 0) {
      const token = tempNumeric.shift()
      totalAmount = parseFloat(token.replace(/[₹$€%,]/g, ''))
      if (isNaN(totalAmount)) {
        valid = false
        console.log('  ❌ Invalid total amount')
      } else {
        console.log('  Extracted total amount:', totalAmount)
      }
    } else {
      valid = false
      console.log('  ❌ No total amount found')
    }
    
    if (tempNumeric.length > 0) {
      const token = tempNumeric.shift()
      rate = parseFloat(token.replace(/[₹$€%,]/g, ''))
      if (isNaN(rate)) {
        tempNumeric.unshift(token)
        rate = null
        console.log('  Rate token is not a number, pushed back')
      } else {
        console.log('  Extracted rate:', rate)
      }
    }
    
    if (tempNumeric.length > 0) {
      const token = tempNumeric.shift()
      mrp = parseFloat(token.replace(/[₹$€%,]/g, ''))
      if (isNaN(mrp)) {
        tempNumeric.unshift(token)
        mrp = null
        console.log('  MRP token is not a number, pushed back')
      } else {
        console.log('  Extracted MRP:', mrp)
      }
    }
    
    if (tempNumeric.length > 0) {
      const token = tempNumeric.shift()
      const qtyMatch = token.match(/^(\d+)/)
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1])
        console.log('  Extracted qty:', qty)
      } else {
        valid = false
        console.log('  ❌ Invalid qty token')
      }
    } else {
      valid = false
      console.log('  ❌ No qty token found')
    }
    
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
  
}).catch(err => {
  console.error('❌ Error parsing PDF:', err)
})
