
const { cleanInvoiceRow } = require('./src/utils/invoiceUtils');

// Simulate an item with Liplock Liquid Matte Lipstick
const testItem = {
  product_name: "Poppik Liplock Liquid Matte Lipstick- 1",
  mrp: 140.52,
  rate: 117.1,
  disc: 3,
  tax: 18,
  total: 2412.59
};

const result = cleanInvoiceRow(testItem);

console.log('cleanInvoiceRow result:', result);
