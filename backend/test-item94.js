
const testRow = "94Poppik Nailpaint- 133304100051 PCS129 (64.4% OFF) 45.9270.26 (3%) 408.9 (18%) 2,680.56";

let fixed = testRow
  .replace(/(-\s*)(\d+)(3304\d{4})/g, '$1$2 $3')
  .replace(/(\b3304\d{4})(\d+)/g, '$1 $2')
  .replace(/(\s+\d+\s+\d+)$/, '');

console.log("Original:", testRow);
console.log("Fixed:", fixed);
