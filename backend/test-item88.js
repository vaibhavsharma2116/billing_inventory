
const testItem = "88Poppik Neon Nailpaint- 433304100036 PCS129 (64.4% OFF) 45.9249.59 (3%) 288.63 (18%) 1,892.16";
console.log('Original:', testItem);

let fixedFullRowText = testItem.replace(/(-\s*)(\d{1,2})(3304\d{4,})/g, '$1$2 $3');
console.log('Fixed Full:', fixedFullRowText);

let normalizedText = fixedFullRowText.replace(/\([\s\S]*?\)/g, ' ').trim();
console.log('Normalized:', normalizedText);

const normalizedTextBeforeDotFixed = normalizedText.replace(/(\d+\.\d{2})(\d+)\.(\d+)/g, '$1 $2.$3');
console.log('Normalized with fixed dots:', normalizedTextBeforeDotFixed);

const numbersArray = normalizedTextBeforeDotFixed.replace(/[^0-9.\s/g, '').split(/\s+/).map(n => n.trim()).filter(Boolean);
console.log('Numbers array:', numbersArray);

console.log('MRP:', parseFloat(numbersArray[numbersArray.length -5]));
console.log('Rate:', parseFloat(numbersArray[numbersArray.length -4]));
console.log('Total:', parseFloat(numbersArray[numbersArray.length -1]));
