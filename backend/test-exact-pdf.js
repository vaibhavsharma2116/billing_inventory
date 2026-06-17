// Exact lines from the PDF image
const lines = [
  "1CTU - 61 PCS - 0 (0%) 0",
  "2Poppik Makeup Fixer Spray33041000 1040 PCS 325 (64.41% OFF) 115.6721,653.33 (18%) 1,41,949.6",
  "3Poppik Makeup Sponge33041000 300 PCS 299 (64.41% OFF) 106.425,746.88 (18%) 37,674"
];

console.log('=== Lines to parse ===', lines);

// Now let's apply our parsing logic
function parseProductLine(line, nextLines) {
  const serialMatch = line.match(/^(\d+)([^\d].*)$/);
  if (!serialMatch) return null;

  const serialNum = parseInt(serialMatch[1]);
  let productLine = serialMatch[2];
  let allProductText = productLine;
  let allNumbers = [];

  const extractNumbers = (text) => {
    let processed = text.replace(/(\.\d{2})(\d)/g, '$1 $2');
    const matches = processed.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
    return matches || [];
  };

  const mainNums = extractNumbers(productLine);
  if (mainNums) allNumbers.push(...mainNums);

  let i = 0;
  while (i < nextLines.length) {
    const nextLine = nextLines[i].trim();
    const isNextProduct = /^\d+[^\d]/.test(nextLine);
    const isTotalLine = nextLine.toLowerCase().includes('total') || 
                       nextLine.toLowerCase().includes('subtotal');
    if (isNextProduct || isTotalLine) {
      break;
    }
    allProductText += ' ' + nextLine;
    const nextNums = extractNumbers(nextLine);
    if (nextNums) allNumbers.push(...nextNums);
    i++;
  }

  let productName = '';
  let hsn = '';
  let quantity = 1;
  let costPrice = 0;
  let sellingPrice = 0;

  const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
  console.log('All numbers for product:', nums);

  let hsnIndex = -1;
  for (let j = 0; j < nums.length; j++) {
    const numStr = nums[j].toString();
    if (Number.isInteger(nums[j]) && numStr.length === 8) { // HSN is exactly 8 digits in PDF
      hsn = numStr;
      hsnIndex = j;
      break;
    }
  }

  let textForQty = allProductText;
  if (hsn) {
    textForQty = textForQty.replace(hsn, '');
  }
  const qtyMatch = textForQty.match(/(\d+)\s*(?:PCS|PCS\.|NOS|NO\.|QTY)/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1]);
  }

  let priceCandidates = nums.filter((n, j) => 
    j !== hsnIndex && 
    n > 0 && 
    n !== quantity && 
    n < 100000 &&
    // Exclude tax percentages (like 18), discount percentages (like 64.41), and big totals (like 21653.33, 37674, 141949.6)
    n !== 18 && // exclude common tax percentage
    n !== 64.41 && // exclude common discount percentage
    n < 5000 // MRP and Rate are probably less than 5000 for these products
  );
  console.log('Filtered price candidates:', priceCandidates);

  // Now pick Rate as costPrice and MRP as sellingPrice
  if (priceCandidates.length >= 2) {
    priceCandidates.sort((a, b) => a - b);
    // Rate is usually the smaller one, MRP is the bigger one
    costPrice = priceCandidates[0];
    sellingPrice = priceCandidates[priceCandidates.length - 1];
  } else if (priceCandidates.length === 1) {
    costPrice = priceCandidates[0];
    sellingPrice = costPrice * 1.2;
  }

  productName = allProductText
    .replace(/[\d,₹$€%\-.()@]/g, ' ')
    .replace(/(?:PCS|PCS\.|NOS|NO\.|QTY|HSN|MRP|RATE|TAX|TOTAL|OFF|%)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { productName, hsn, quantity, costPrice, sellingPrice };
}

const products = [];
for (let i = 0; i < lines.length; i++) {
  const product = parseProductLine(lines[i], lines.slice(i+1));
  if (product) {
    products.push(product);
    // Skip any lines that were part of this product
    // (We'll figure this out later, for now just process one by one)
  }
}

console.log('=== Final products ===', products);