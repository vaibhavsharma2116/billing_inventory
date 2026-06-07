const XLSX = require('xlsx')

// Sample product data
const data = [
  {
    'Product Name': 'Paracetamol 500mg',
    'SKU': 'PAR-001',
    'HSN': '3004',
    'Batch': 'BATCH-2024-001',
    'Expiry Date': '2026-12-31',
    'Cost Price': 50.00,
    'Selling Price': 70.00,
    'GST%': 12,
    'Stock': 100
  },
  {
    'Product Name': 'Vitamin C Tablets',
    'SKU': 'VIT-001',
    'Batch': 'BATCH-2024-002',
    'Expiry Date': '2027-06-30',
    'Cost Price': 80.50,
    'Selling Price': 110.00,
    'GST%': 18,
    'Stock': 50
  },
  {
    'Product Name': 'ORS Solution',
    'SKU': 'ORS-001',
    'Batch': 'BATCH-2024-003',
    'Expiry Date': '2025-09-15',
    'Cost Price': 25.00,
    'Selling Price': 35.00,
    'GST%': 5,
    'Stock': 200
  }
]

// Create workbook and worksheet
const worksheet = XLSX.utils.json_to_sheet(data)
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')

// Write file
XLSX.writeFile(workbook, 'sample-products.xlsx')
console.log('✅ Sample product Excel file created: sample-products.xlsx')
console.log('📋 Columns in file: Product Name, SKU, HSN, Batch, Expiry Date, Cost Price, Selling Price, GST%, Stock')
