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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const supplierName = req.body.supplierName || 'Supplier'
    
    let items = []
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) // First, read as array of arrays to debug

    console.log('Raw Excel data (array of arrays):', jsonData)
    
    // Now read with headers properly
    const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet)
    console.log('Excel data with headers:', jsonDataWithHeaders)

    items = jsonDataWithHeaders.map((row, index) => ({
      productName: row['Product Name'] || row['ProductName'] || row['name'] || row['Name'] || '',
      sku: row['SKU'] || row['sku'] || row['Sku'] || '',
      batchNo: row['Batch'] || row['Batch No'] || row['batchNo'] || row['batch'] || '',
      expiryDate: row['Expiry'] || row['Expiry Date'] || row['expiryDate'] || row['expiry'] || null,
      costPrice: parseFloat(row['Cost Price'] || row['costPrice'] || row['cost'] || row['Cost'] || 0),
      gstPercentage: parseFloat(row['GST%'] || row['GST'] || row['gstPercentage'] || row['gst'] || 0),
      quantity: parseInt(row['Quantity'] || row['Qty'] || row['quantity'] || row['qty'] || 0)
    })).filter(item => item.sku || item.productName)

    console.log('Processed items:', items)

    if (items.length === 0) {
      return res.status(400).json({ 
        error: 'No valid items found in file', 
        rawData: jsonDataWithHeaders,
        message: 'Make sure your Excel has columns like: Product Name, SKU, Cost Price, Quantity'
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

      if (item.sku) {
        product = await prisma.product.upsert({
          where: { 
            distributorId_sku: {
              distributorId: req.user.distributorId,
              sku: item.sku
            }
          },
          update: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice,
            ...(item.batchNo && { batchNo: item.batchNo }),
            ...(item.expiryDate && { expiryDate: new Date(item.expiryDate) })
          },
          create: {
            name: item.productName || 'Unnamed Product',
            sku: item.sku,
            hsn: '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            distributorId: req.user.distributorId
          }
        })
      } else {
        product = await prisma.product.create({
          data: {
            name: item.productName || 'Unnamed Product',
            sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hsn: '',
            batchNo: item.batchNo || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            costPrice: item.costPrice,
            baseSellingPrice: item.costPrice * 1.2,
            gstPercentage: item.gstPercentage,
            currentStock: item.quantity,
            distributorId: req.user.distributorId
          }
        })
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
        action: item.sku ? (product ? 'updated' : 'created') : 'created'
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
