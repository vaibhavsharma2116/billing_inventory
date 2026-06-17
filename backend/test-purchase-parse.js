const fs = require('fs')
const pdfParse = require('pdf-parse')

async function test() {
  const dataBuffer = fs.readFileSync('./uploads/30f78389db3d1e6e657829dde514686e')
  const data = await pdfParse(dataBuffer)
  console.log('=== FULL TEXT ===')
  console.log(data.text)
  
  const lines = data.text.split(/\r?\n/).filter(line => line.trim())
  
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
  
  console.log('Header index:', headerRowIndex)
  
  let tempItems = []
  let currentItem = null
  let pastItems = false
  
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    console.log('Processing:', line)
    if (line.toLowerCase().includes('subtotal') || line.toLowerCase().includes('total')) {
      pastItems = true
    }
    if (pastItems) {
      continue
    }
    
    if (line.toLowerCase().includes('terms') ||
        line.toLowerCase().includes('received') ||
        line.toLowerCase().includes('invoice') ||
        line.toLowerCase().includes('original') ||
        line.length < 3) {
      continue
    }
    
    const newItemMatch = line.match(/^(\d+)\s*(.*)/)
    if (newItemMatch) {
      const itemNumber = newItemMatch[1]
      const restOfLine = newItemMatch[2]
      const hasLetters = /[a-zA-Z]/.test(restOfLine)
      if (hasLetters) {
        if (currentItem && currentItem.productName) {
          tempItems.push(currentItem)
        }
      } else {
        if (currentItem) {
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
      
      let hsn = ''
      const hsnMatch = restOfLine.match(/(\d{6,8})/)
      if (hsnMatch) {
        hsn = hsnMatch[1]
      }
      
      let quantity = 1
      let tempRestOfLine = restOfLine.replace(hsn, '')
      const qtyMatch = tempRestOfLine.match(/(\d+)(?=\s*PCS)/i) ||
                       tempRestOfLine.match(/(\d+)(?=\s*NOS)/i) ||
                       tempRestOfLine.match(/(\d+)(?=\s*QTY)/i)
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1])
      }
      
      let productName = restOfLine
        .replace(hsn, '')
        .replace(/\d+\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/gi, '')
        .replace(/\d/g, '')
        .replace(/[₹$€%,\-–()\.\/\t-]/g, '')
        .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, '')
        .trim()
      productName = productName.replace(/\s{2,}/g, ' ').trim()
      
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
        .replace(/[₹$€%,\-–()\.\/\t-]/g, '')
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
  console.log('Extracted items:', items)
}

test().catch(console.error)
