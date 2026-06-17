const fs = require('fs')
const pdfParse = require('pdf-parse')

// Try to parse the latest uploaded PDF
const testPdfPath = './uploads/30f78389db3d1e6e657829dde514686e'

if (fs.existsSync(testPdfPath)) {
  console.log('Testing PDF parsing for', testPdfPath)
  const dataBuffer = fs.readFileSync(testPdfPath)
  
  pdfParse(dataBuffer).then(data => {
    console.log('=== PDF TEXT ===')
    console.log(data.text)
    console.log('=== PDF LINES ===')
    const lines = data.text.split(/\r?\n/).filter(line => line.trim())
    console.log(lines)
    
    // Now let's test our parsing logic!
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
      if (pastItems) continue
      
      // Skip if line looks like a footer or not relevant
      if (line.toLowerCase().includes('terms') ||
          line.toLowerCase().includes('received') ||
          line.toLowerCase().includes('invoice') ||
          line.toLowerCase().includes('original') ||
          line.length < 3) {
        continue
      }
      
      // Check if this is a new item line (starts with a number, optional space, and has non-numeric/symbol content)
      const newItemMatch = line.match(/^(\d+)\s*(.*)/)
      if (newItemMatch) {
        const itemNumber = newItemMatch[1]
        const restOfLine = newItemMatch[2]
        // Check if restOfLine has at least some letters
        const hasLetters = /[a-zA-Z]/.test(restOfLine)
        if (hasLetters) {
          // Save previous item if exists
          if (currentItem && currentItem.productName) {
            tempItems.push(currentItem)
          }
        } else {
          // Treat as continuation line if currentItem exists
          if (currentItem) {
            // Check if this line has rate or tax info
            const rateMatch = line.match(/([\d,]+\.\d{2})/)
            if (rateMatch) {
              currentItem.costPrice = parseFloat(rateMatch[1].replace(/,/g, ''))
            }
            const gstMatch = line.match(/(\d+)\s*%/)
            if (gstMatch) {
              currentItem.gstPercentage = parseFloat(gstMatch[1])
            }
          }
          continue
        }
        
        console.log('restOfLine:', restOfLine)
        
        let hsn = ''
        const hsnMatch = restOfLine.match(/(\d{6,8})/)
        if (hsnMatch) {
          hsn = hsnMatch[1]
          console.log('Found hsn:', hsn)
        }
        
        let quantity = 1
        // Remove HSN first to avoid matching it as quantity
        let tempRestOfLine = restOfLine.replace(hsn, '')
        // Now match quantity from tempRestOfLine
        const qtyMatch = tempRestOfLine.match(/(\d+)(?=\s*PCS)/i) || 
                         tempRestOfLine.match(/(\d+)(?=\s*NOS)/i) ||
                         tempRestOfLine.match(/(\d+)(?=\s*QTY)/i)
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1])
          console.log('Found quantity:', quantity)
        }
        
        // Extract product name by removing numbers, HSN, quantity, etc.
        let productName = restOfLine
          .replace(hsn, '') // remove HSN
          .replace(/\d+\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/gi, '') // remove quantity
          .replace(/\d/g, '') // remove remaining numbers
          .replace(/[₹$€%,\-–()\.\/\t-]/g, '') // remove symbols
          .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '') // remove keywords
          .trim()
        
        productName = productName.replace(/\s{2,}/g, ' ').trim()
        console.log('productName:', productName)
        
        currentItem = {
          productName,
          sku: '',
          hsn,
          batchNo: '',
          expiryDate: null,
          costPrice: 0,
          gstPercentage: 0,
          quantity
        }
        
      } else if (currentItem) {
        // Check if this line has rate or tax info
        const rateMatch = line.match(/([\d,]+\.\d{2})/)
        if (rateMatch) {
          currentItem.costPrice = parseFloat(rateMatch[1].replace(/,/g, ''))
        }
        const gstMatch = line.match(/(\d+)\s*%/)
        if (gstMatch) {
          currentItem.gstPercentage = parseFloat(gstMatch[1])
        }
        
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
    
    if (currentItem && currentItem.productName) {
      tempItems.push(currentItem)
    }
    
    const items = tempItems.filter(item => item.productName.length > 2)
    console.log('Final parsed items:', items)
    
  }).catch(err => console.error(err))
} else {
  console.log('Test PDF not found')
}
