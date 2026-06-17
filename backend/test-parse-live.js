const fs = require('fs')
const pdfParse = require('pdf-parse')

async function testParse() {
  const files = ['uploads/3c23f8ea204e81a24674058cb401046a', 'bill.pdf', 'll.pdf', 'ls.pdf']
  for (const file of files) {
    if (!fs.existsSync(file)) continue
    console.log('=== Testing', file)
    const dataBuffer = fs.readFileSync(file)
    try {
      const data = await pdfParse(dataBuffer)
      console.log('PDF text:', data.text)

      const lines = data.text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      console.log('=== Lines:', lines)

      // Find header
      const headerPatterns = [
        {
          keywords: ['hsn', 'qty', 'mrp', 'rate'],
          matchCount: 2
        },
        {
          keywords: ['hsn', 'pcs', 'rate', 'total'],
          matchCount: 2
        },
        {
          keywords: ['items', 'hsn', 'quantity'],
          matchCount: 2
        },
        {
          keywords: ['description', 'hsn', 'qty'],
          matchCount: 2
        },
        {
          keywords: ['product', 'hsn', 'quantity'],
          matchCount: 2
        },
        {
          keywords: ['item', 'hsn', 'qty'],
          matchCount: 2
        }
      ]
      let headerRowIndex = -1
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase()
        for (const pattern of headerPatterns) {
          let matches = 0
          for (const keyword of pattern.keywords) {
            if (lineLower.includes(keyword)) matches++
          }
          if (matches >= pattern.matchCount) {
            headerRowIndex = i
            console.log('Found header at index:', headerRowIndex, lines[i])
            break
          }
        }
        if (headerRowIndex !== -1) break
      }

      // Parse products
      const jsonData = []
      if (headerRowIndex !== -1) {
        let i = headerRowIndex + 1
        while (i < lines.length) {
          const line = lines[i].trim()
          console.log('Processing line:', line, 'index:', i)

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
            break
          }

          const serialMatch = line.match(/^(\d+)([^\d].*)$/)
          if (serialMatch) {
            const serialNum = parseInt(serialMatch[1])
            let productLine = serialMatch[2]
            let allProductText = productLine
            let allNumbers = []

            const extractNumbers = (text) => {
                let processed = text.replace(/(\.\d{2})(\d)/g, '$1 $2')
                // Also split combined HSN and quantity: look for 8-digit number followed by more digits!
                processed = processed.replace(/(\d{8})(\d+)/g, '$1 $2')
                const matches = processed.match(/\d+(?:,\d+)*(?:\.\d+)?/g)
                return matches || []
              }

            const mainNums = extractNumbers(productLine)
            if (mainNums) allNumbers.push(...mainNums)

            i++
              while (i < lines.length) {
                const nextLine = lines[i].trim()
                const isNextProduct = /^\d+[^\d]/.test(nextLine)
                const isTotalLine = nextLine.toLowerCase().includes('total') || 
                                   nextLine.toLowerCase().includes('subtotal')
                if (isNextProduct || isTotalLine) {
                  break
                }
                allProductText += ' ' + nextLine
                // Extract numbers from this line
                const nextNums = extractNumbers(nextLine)
                if (nextNums) allNumbers.push(...nextNums)
                i++
              }

            let productName = ''
            let hsn = ''
            let quantity = 1
            let costPrice = 0
            let sellingPrice = 0

            const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n))
            console.log('All collected numbers:', nums)

            let hsnIndex = -1
            for (let j = 0; j < nums.length; j++) {
              const numStr = nums[j].toString()
              console.log('Checking num for HSN:', numStr, Number.isInteger(nums[j]), numStr.length)
              if (Number.isInteger(nums[j]) && numStr.length === 8) {
                hsn = numStr
                hsnIndex = j
                console.log('Found HSN:', hsn, 'at index:', hsnIndex)
                break
              }
            }

            let textForQty = allProductText
            if (hsn) {
              textForQty = textForQty.replace(hsn, '')
            }
            const qtyMatch = textForQty.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i)
            if (qtyMatch) {
              quantity = parseInt(qtyMatch[1])
              console.log('Found quantity:', quantity)
            } else {
              // If no qty match, find the number right after HSN!
              if (hsnIndex !== -1 && hsnIndex + 1 < nums.length) {
                const candidateQty = nums[hsnIndex + 1]
                if (Number.isInteger(candidateQty) && candidateQty > 0 && candidateQty < 10000) {
                  quantity = candidateQty
                  console.log('Found quantity after HSN:', quantity)
                }
              }
            }

            const priceCandidates = nums.filter((n, j) => 
              j !== hsnIndex && 
              n > 0 && 
              n !== quantity && 
              n < 100000 &&
              n !== 18 && 
              n !== 64.41 && 
              n < 5000
            )
            console.log('Filtered price candidates:', priceCandidates)

            if (priceCandidates.length >= 2) {
              priceCandidates.sort((a, b) => a - b)
              costPrice = priceCandidates[0]
              sellingPrice = priceCandidates[priceCandidates.length - 1]
            } else if (priceCandidates.length === 1) {
              costPrice = priceCandidates[0]
              sellingPrice = costPrice * 1.2
            }

            productName = allProductText
              .replace(/[\d,₹$€%\-.()@]/g, ' ')
              .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF|%)/gi, ' ')
              .replace(/\s{2,}/g, ' ')
              .trim()

            console.log('Parsed product:', { productName, hsn, quantity, costPrice, sellingPrice })

            if (productName.length > 2 && quantity > 0) {
              jsonData.push({
                'name': productName,
                'sku': '',
                'hsn': hsn,
                'cost': costPrice,
                'price': sellingPrice,
                'gst': 0,
                'quantity': quantity
              })
            }
          } else {
            i++
          }
        }
      }
      console.log('Final products:', jsonData)
    } catch (err) {
      console.error('Error parsing', file, err)
    }
  }
}

testParse()
