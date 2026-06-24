
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function testCsaParser() {
  const filePath = path.join(__dirname, 'liv1.pdf');
  const dataBuffer = fs.readFileSync(filePath);
  const rawTextData = await pdfParse(dataBuffer);
  const rawText = rawTextData.text;
  
  // --- EXACT CODE FROM CSA.JS ---
  console.log('=== FULL PDF TEXT ===');
  console.log(rawText);
  const lines = rawText.split(/\r?\n/).filter(line => line.trim());
  console.log('\n=== PDF LINES ===');
  lines.forEach((line, i) => {
    console.log(`${i}: ${line}`);
  });

  // First, let's find the header row
  let headerRowIndex = -1
  const headerPatterns = [
    ['no', 'items', 'hsn', 'qty'],
    ['item', 'product', 'hsn', 'quantity'],
    ['sl', 'description', 'hsn', 'qty'],
    ['serial', 'product', 'hsn', 'rate'],
    ['no', 'items', 'hsn no', 'qty'],
    ['no', 'items', 'hsn no.', 'qty.'],
    ['no', 'items', 'hsn', 'mrp', 'rate']
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
  
  console.log(`\nFound header at index ${headerRowIndex}`);

  let items = [];
  if (headerRowIndex !== -1) {
    let i = headerRowIndex + 1
    while (i < lines.length) {
      const line = lines[i].trim()
      console.log(`Processing line ${i}: ${line}`);
      
      if (line.toLowerCase().includes('total') || 
          line.toLowerCase().includes('subtotal') || 
          line.toLowerCase().includes('grand') ||
          line.toLowerCase().includes('terms') ||
          line.toLowerCase().includes('dispute') ||
          line.toLowerCase().includes('jurisdiction') ||
          line.toLowerCase().includes('rupee') ||
          line.toLowerCase().includes('lakh') ||
          line.toLowerCase().includes('thousand') ||
          line.toLowerCase().includes('original for recipient') ||
          line.toLowerCase().includes('taxable') ||
          line.toLowerCase().includes('received amount')) {
        i++
        break // Stop at total/subtotal
      }
      
      if (!/\d/.test(line) || line.length < 10) {
        i++
        continue
      }
      
      const serialMatch = line.match(/^\s*(\d+)\s+(.*)$/)
      if (serialMatch) {
        const serialNum = parseInt(serialMatch[1])
        let productLine = serialMatch[2]
        
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim()
          if (nextLine.startsWith('@') || nextLine.toLowerCase().includes('off')) {
            i++
          } else if (!/\d/.test(nextLine)) {
            productLine += " " + nextLine
            i++
          }
        }
        
        console.log(`Product line ${i}: ${productLine}`);
        
        let productName = ''
        let hsn = ''
        let quantity = 1
        let costPrice = 0
        
        const numMatches = productLine.match(/[\d,]+(?:\.\d+)?/g)
        if (numMatches) {
          const nums = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n))
          console.log(`Numbers in line: ${nums}`);
          
          let hsnIndex = -1
          for (let j = 0; j < nums.length; j++) {
            const numStr = nums[j].toString()
            if (numStr.length >= 6 && numStr.length <= 8) {
              hsn = numStr
              hsnIndex = j
              break
            }
          }
          
          const qtyMatch = productLine.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i)
          if (qtyMatch) {
            quantity = parseInt(qtyMatch[1])
          } else {
            for (let j = 0; j < nums.length; j++) {
              if (j !== hsnIndex && nums[j] > 0 && nums[j] < 10000) {
                quantity = Math.round(nums[j])
                break
              }
            }
          }
          
          const priceCandidates = nums.filter((n, j) => j !== hsnIndex && n > 0 && n !== quantity)
          if (priceCandidates.length >= 2) {
            priceCandidates.sort((a, b) => a - b)
            costPrice = priceCandidates[0]
          } else if (priceCandidates.length === 1) {
            costPrice = priceCandidates[0]
          }
        }
        
        productName = productLine
          .replace(/[\d,₹$€%\-.()@]/g, ' ')
          .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF)/gi, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
        
        console.log(`Parsed product: ${productName}, HSN ${hsn}, Qty ${quantity}, Cost ${costPrice}`);
        
        if (productName.length > 2 && quantity > 0) {
          items.push({
            productName,
            sku: '',
            hsn,
            batchNo: '',
            expiryDate: null,
            costPrice,
            gstPercentage: 0,
            quantity
          })
        }
      }
      
      i++
    }
  }

  console.log("\n✅ Parsed Products from CSA.js parser:");
  items.forEach((p, idx) => {
    console.log(`${idx+1}. ${p.productName}: Qty ${p.quantity}, HSN ${p.hsn}, Cost ${p.costPrice}`);
  });
}

testCsaParser().catch(err => console.error('Error:', err));
