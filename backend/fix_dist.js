const fs = require('fs');
const csaContent = fs.readFileSync('../frontend/src/components/SuperAdminProducts.jsx', 'utf8');

let distContent = csaContent
  .replace(/SuperAdminProducts/g, 'SuperAdminDistributorProducts')
  .replace(/csaId/g, 'distributorId')
  .replace(/csas/g, 'distributors')
  .replace(/csa/g, 'distributor')
  .replace(/addToAllCsas/g, 'addToAllDistributors')
  .replace(/CSAs/g, 'Distributors')
  .replace(/CSA/g, 'Distributor')
  .replace(/Csas/g, 'Distributors')
  .replace(/Csa/g, 'Distributor');

fs.writeFileSync('../frontend/src/components/SuperAdminDistributorProducts.jsx', distContent);
console.log('Fixed SuperAdminDistributorProducts.jsx');
