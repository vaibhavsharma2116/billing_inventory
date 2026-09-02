const fs = require('fs');
let content = fs.readFileSync('../frontend/src/components/SuperAdminDistributorProducts.jsx', 'utf8');

content = content.replace(/`\/superadmin\/products\${params/g, '`/superadmin/products/distributor${params');
content = content.replace(/`\/superadmin\/products`, \{/g, '`/superadmin/products/distributor`, {');
content = content.replace(/`\/superadmin\/products\/\${id/g, '`/superadmin/products/distributor/${id');
content = content.replace(/`\/superadmin\/products\/all/g, '`/superadmin/products/distributor/all');
content = content.replace(/`\/superadmin\/products\/upload/g, '`/superadmin/products/distributor/upload');

// One endpoint shouldn't be replaced! The edit endpoint is: `/superadmin/products/${editingProduct.id}`.
// The replace above replaced it with `/superadmin/products/distributor/${editingProduct.id}` which is WRONG.
content = content.replace(/`\/superadmin\/products\/distributor\/\${editingProduct\.id/g, '`/superadmin/products/${editingProduct.id');

fs.writeFileSync('../frontend/src/components/SuperAdminDistributorProducts.jsx', content);
console.log('Fixed endpoints');
