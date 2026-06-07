const XLSX = require('xlsx')

// Sample data
const data = [
  {
    'Product Name': 'Paracetamol 500mg',
    'SKU': 'PAR-001',
    'Batch': 'BATCH-2024-001',
    'Expiry Date': '2026-12-31',
    'Cost Price': 50.00,
    'GST%': 12,
    'Quantity': 100
  },
  {
    'Product Name': 'Vitamin C Tablets',
    'SKU': 'VIT-001',
    'Batch': 'BATCH-2024-002',
    'Expiry Date': '2027-06-30',
    'Cost Price': 80.50,
    'GST%': 18,
    'Quantity': 50
  },
  {
    'Product Name': 'ORS Solution',
    'SKU': 'ORS-001',
    'Batch': 'BATCH-2024-003',
    'Expiry Date': '2025-09-15',
    'Cost Price': 25.00,
    'GST%': 5,
    'Quantity': 200
  }
]

// Create workbook and worksheet
const worksheet = XLSX.utils.json_to_sheet(data)
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')

// Write file
XLSX.writeFile(workbook, 'sample-purchase-invoice.xlsx')
console.log('✅ Sample Excel file created: sample-purchase-invoice.xlsx')
console.log('📋 Columns in file: Product Name, SKU, Batch, Expiry Date, Cost Price, GST%, Quantity')
