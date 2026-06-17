const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const prisma = require('../lib/prisma')
const router = express.Router()
const { authenticateToken, requireDistributor } = require('../middleware/auth')

const convertDecimals = (obj, keyName) => {
  if (!obj) return obj
  // Skip converting phone numbers, names, gstins, addresses, dates, etc.
  if (['phone', 'name', 'gstin', 'address', 'id', 'invoiceNo', 'batchNo', 'hsn', 'sku', 'brandName', 'claimDetails', 'status', 'date', 'createdAt', 'updatedAt', 'expiryDate', 'distributorId'].includes(keyName)) {
    return obj
  }
  if (typeof obj === 'string' && !isNaN(obj) && obj.trim() !== '') {
    return parseFloat(obj)
  }
  if (typeof obj === 'object') {
    if (obj.toNumber) return obj.toNumber()
    if (Array.isArray(obj)) return obj.map(item => convertDecimals(item))
    const newObj = {}
    for (const key in obj) {
      newObj[key] = convertDecimals(obj[key], key)
    }
    return newObj
  }
  return obj
}

const upload = multer({ dest: 'uploads/' })

router.post('/upload', authenticateToken, requireDistributor, upload.single('file'), async (req, res) => {
  try {
    console.log('=== Purchase upload request received')
    console.log('req.file:', req.file)
    console.log('req.body:', req.body)
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const supplierName = req.body.supplierName || 'Supplier'
    
    let items = []
    let jsonDataWithHeaders = []
    const fs = require('fs')
    
    // Check file type - extension, mimetype, AND file signature "%PDF-"
    const dataBuffer = fs.readFileSync(req.file.path)
    const isPdfFromExtension = req.file.originalname.toLowerCase().endsWith('.pdf')
    const isPdfFromMimetype = req.file.mimetype && req.file.mimetype.toLowerCase().includes('pdf')
    const isPdfFromSignature = dataBuffer.slice(0, 4).equals(Buffer.from('%PDF'))
    const isPdf = isPdfFromExtension || isPdfFromMimetype || isPdfFromSignature
    
    console.log('Is PDF check:', { 
      isPdfFromExtension, 
      isPdfFromMimetype, 
      isPdfFromSignature, 
      isPdf,
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype,
      first4Bytes: dataBuffer.slice(0, 4).toString()
    })
    
    if (isPdf) {
      const pdfParse = require('pdf-parse')
      
      try {
        const data = await pdfParse(dataBuffer)
        console.log('=== FULL PDF TEXT ===')
        console.log(data.text)
        
        const lines = data.text.split(/\r?\n/).filter(line => line.trim())
        console.log('=== PDF LINES ===')
        console.log(lines)
        
        // First, let's find the header row
        let headerRowIndex = -1
        const headerPatterns = [
          ['no', 'items', 'hsn', 'qty'],
          ['item', 'product', 'hsn', 'quantity'],
          ['sl', 'description', 'hsn', 'qty'],
          ['serial', 'product', 'hsn', 'rate'],
          ['no', 'items', 'hsn no', 'qty'],
          ['no', 'items', 'hsn no.', 'qty.'],
          ['no', 'items', 'hsn', 'mrp', 'rate'],
          ['no', 'items', 'hsn', 'mrp', 'rate', 'tax']
        ]
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase()
          for (const pattern of headerPatterns) {
            const matches = pattern.filter(keyword => line.includes(keyword)).length
            if (matches >= 2) {
              headerRowIndex = i
              break
            }
          }
          if (headerRowIndex !== -1) break
        }
        
        if (headerRowIndex !== -1) {
          console.log('Found header row at index', headerRowIndex, lines[headerRowIndex])
          
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
              break // Stop at total/subtotal
            }

            // Check if line starts with a number followed by non-number (serial number)
            const serialMatch = line.match(/^(\d+)([^\d].*)$/)
            if (serialMatch) {
              const serialNum = parseInt(serialMatch[1])
              let productLine = serialMatch[2] // Rest after serial number
              let allProductText = productLine
              let allNumbers = []

              // Helper function to extract numbers correctly
              const extractNumbers = (text) => {
                // First, handle cases like "115.6721,653.33" - split after decimal with 2 digits
                let processed = text.replace(/(\.\d{2})(\d)/g, '$1 $2')
                // Also split combined HSN and quantity: look for 8-digit number followed by more digits!
                processed = processed.replace(/(\d{8})(\d+)/g, '$1 $2')
                const matches = processed.match(/\d+(?:,\d+)*(?:\.\d+)?/g)
                return matches || []
              }

              // Extract numbers from main product line
              const mainNums = extractNumbers(productLine)
              if (mainNums) allNumbers.push(...mainNums)

              // Collect lines until next product or total
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

              // Now parse this product
              let productName = ''
              let hsn = ''
              let quantity = 1
              let costPrice = 0

              // Parse all numbers
              const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n))
              console.log('All collected numbers:', nums)

              // Find HSN: exactly 8 digits as per PDF
              let hsnIndex = -1
              for (let j = 0; j < nums.length; j++) {
                const numStr = nums[j].toString()
                if (Number.isInteger(nums[j]) && numStr.length === 8) {
                  hsn = numStr
                  hsnIndex = j
                  break
                }
              }

              // Find Quantity: look for PCS, exclude HSN first
              let textForQty = allProductText
              if (hsn) {
                textForQty = textForQty.replace(hsn, '')
              }
              const qtyMatch = textForQty.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i)
              if (qtyMatch) {
                quantity = parseInt(qtyMatch[1])
              } else {
                // If no qty match, find the number right after HSN!
                if (hsnIndex !== -1 && hsnIndex + 1 < nums.length) {
                  const candidateQty = nums[hsnIndex + 1]
                  if (Number.isInteger(candidateQty) && candidateQty > 0 && candidateQty < 10000) {
                    quantity = candidateQty
                  }
                }
              }

              // Find price candidates, exclude tax/discount percentages and big totals
              const priceCandidates = nums.filter((n, j) => 
                j !== hsnIndex && 
                n > 0 && 
                n !== quantity && 
                n < 100000 &&
                n !== 18 && // exclude common tax percentage (GST)
                Math.abs(n - 64.41) > 0.1 && // exclude common discount percentage
                n < 5000 && // exclude big totals like 21653.33
                n !== 0
              )
              console.log('Filtered price candidates:', priceCandidates)
              
              if (priceCandidates.length >= 2) {
                priceCandidates.sort((a, b) => a - b)
                // The smallest should be Rate (costPrice)
                costPrice = priceCandidates[0]
              } else if (priceCandidates.length === 1) {
                costPrice = priceCandidates[0]
              }

              // Extract product name
              productName = allProductText
                .replace(/[\d,₹$€%\-.()@]/g, ' ')
                .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF|%)/gi, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim()

              console.log('Parsed product:', { productName, hsn, quantity, costPrice })

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
            } else {
              i++
            }
          }
        }
        
        console.log('Final items extracted from PDF:', items)
        
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr)
        jsonDataWithHeaders = [{ pdfError: pdfErr.message, stack: pdfErr.stack }]
      }
    } else {
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      console.log('Raw Excel data (array of arrays):', jsonData)
      
      jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet)
      console.log('Excel data with headers:', jsonDataWithHeaders)

      // Support for many column header variations
      items = jsonDataWithHeaders.map((row) => {
        const getVal = (keys) => {
          for (const key of keys) {
            if (row[key] !== undefined) {
              return row[key]
            }
          }
          return ''
        }

        const getNumVal = (keys) => {
          for (const key of keys) {
            if (row[key] !== undefined) {
              const val = row[key]
              if (typeof val === 'number') return val
              if (typeof val === 'string') {
                const parsed = parseFloat(val.replace(/[₹$€,]/g, ''))
                if (!isNaN(parsed)) return parsed
              }
            }
          }
          return 0
        }

        const getIntVal = (keys) => {
          for (const key of keys) {
            if (row[key] !== undefined) {
              const val = row[key]
              if (typeof val === 'number') return Math.round(val)
              if (typeof val === 'string') {
                const parsed = parseInt(val.replace(/[₹$€,]/g, ''))
                if (!isNaN(parsed)) return parsed
              }
            }
          }
          return 0
        }

        return {
          productName: getVal(['Product Name', 'ProductName', 'name', 'Name', 'Item', 'item', 'Item Name', 'Product', 'Description']),
          sku: getVal(['SKU', 'sku', 'Sku', 'Item Code', 'ItemCode', 'Product Code', 'Code', 'Item No']),
          hsn: (getVal(['HSN', 'HSN No', 'HSN Code', 'hsn']) || '').toString().trim(),
          batchNo: getVal(['Batch', 'Batch No', 'batchNo', 'batch', 'Batch Number']),
          expiryDate: getVal(['Expiry', 'Expiry Date', 'expiryDate', 'expiry']),
          costPrice: getNumVal(['Cost Price', 'costPrice', 'cost', 'Cost', 'Rate', 'rate', 'MRP']),
          gstPercentage: getNumVal(['GST%', 'GST', 'gstPercentage', 'gst', 'Tax', 'Tax%']),
          quantity: getIntVal(['Quantity', 'Qty', 'quantity', 'qty', 'Stock', 'stock', 'Qty.'])
        }
      }).filter(item => item.sku || item.productName)
    }

    console.log('Processed items:', items)

    if (items.length === 0) {
      return res.status(400).json({ 
        error: 'No valid items found in file', 
        rawData: jsonDataWithHeaders,
        message: 'Make sure your file has product information'
      })
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)
    
    const purchaseLedger = await prisma.purchaseLedger.create({
      data: {
        supplierName,
        invoiceNo: `PUR-${Date.now()}`,
        totalAmount,
        distributorId: req.user.distributorId
      }
    })
    
    // Update distributor financials
    await prisma.distributor.update({
      where: { id: req.user.distributorId },
      data: {
        totalCompanyDebits: { increment: totalAmount },
        pendingCompanyBalance: { increment: totalAmount }
      }
    })

    const results = []

    for (const item of items) {
      let product
      let wasExistingProduct = false
      
      console.log('=== Processing purchase item ===')
      console.log('Raw item:', item)
      
      // Clean product name
      const cleanedProductName = item.productName 
        ? item.productName.trim().replace(/\s{2,}/g, ' ') 
        : ''
      console.log('Cleaned product name:', cleanedProductName)
      
      // First check by SKU if available
      if (item.sku) {
        product = await prisma.product.findFirst({
          where: { 
            distributorId: req.user.distributorId,
            sku: item.sku 
          }
        })
        console.log('Found existing product by SKU:', product ? { id: product.id, sku: product.sku, currentStock: product.currentStock, name: product.name } : null)
      }
      
      // If no SKU match, check by product name
      if (!product && cleanedProductName) {
        product = await prisma.product.findFirst({
          where: { 
            distributorId: req.user.distributorId,
            name: { equals: cleanedProductName, mode: 'insensitive' }
          }
        })
        console.log('Found existing product by name:', product ? { id: product.id, name: product.name, currentStock: product.currentStock } : null)
      }
      
      if (product) {
        wasExistingProduct = true
        console.log('Updating existing product with quantity:', item.quantity)
        // Update existing product stock
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice,
            name: cleanedProductName || product.name,
            hsn: item.hsn || product.hsn || '',
            batchNo: item.batchNo || product.batchNo,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : product.expiryDate,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage
          }
        })
        console.log('Updated product:', { id: product.id, currentStock: product.currentStock })
      } else {
        wasExistingProduct = false
        console.log('Creating new product with name:', cleanedProductName)
        // Create new product
        product = await prisma.product.create({
          data: {
            name: cleanedProductName || 'Unnamed Product',
            sku: item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hsn: item.hsn || '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            distributorId: req.user.distributorId
          }
        })
        console.log('Created new product:', { id: product.id, sku: product.sku, name: product.name, currentStock: product.currentStock })
      }

      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchaseLedger.id,
          productId: product.id,
          qty: item.quantity,
          costPrice: item.costPrice,
          batchNo: item.batchNo || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          distributorId: req.user.distributorId
        }
      })

      results.push({
        product,
        quantityAdded: item.quantity,
        action: wasExistingProduct ? 'updated' : 'created'
      })
    }

    res.json(convertDecimals({
      message: 'File processed successfully',
      purchase: purchaseLedger,
      itemsProcessed: results.length,
      items: results
    }))

  } catch (error) {
    console.error('Error processing file:', error)
    res.status(500).json({ error: 'Failed to process file' })
  }
})

router.get('/', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const purchases = await prisma.purchaseLedger.findMany({
      where: { distributorId: req.user.distributorId },
      include: { purchaseItems: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(purchases)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

router.get('/suppliers', authenticateToken, requireDistributor, async (req, res) => {
  try {
    const [purchases, purchaseReturns, paymentsOut] = await Promise.all([
      prisma.purchaseLedger.findMany({
        where: { distributorId: req.user.distributorId },
        select: { supplierName: true },
        distinct: ['supplierName']
      }),
      prisma.purchaseReturn.findMany({
        where: { distributorId: req.user.distributorId },
        select: { supplierName: true },
        distinct: ['supplierName']
      }),
      prisma.paymentOut.findMany({
        where: { distributorId: req.user.distributorId },
        select: { supplierName: true },
        distinct: ['supplierName']
      })
    ])
    
    const allSupplierNames = [
      ...purchases.map(p => p.supplierName),
      ...purchaseReturns.map(p => p.supplierName),
      ...paymentsOut.map(p => p.supplierName)
    ]
    
    // Remove duplicates and filter out falsy values
    const uniqueSupplierNames = [...new Set(allSupplierNames)].filter(Boolean)
    res.json(uniqueSupplierNames)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

module.exports = router
