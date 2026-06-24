
// Test the fix with a problematic line from the PDF!
const testLine = "69Poppik Neon Nailpaint- 243304100024 PCS129 (64.4% OFF) 45.9233.06 (3%) 192.42 (18%) 1,261.44";
console.log("Original line:", testLine);

let fixedFullRowText = testLine
  // 1. Split numbers that have "3304" (HSN prefix) starting at position 2 or later
  // Like "- 243304100024" → "- 24 3304100024"
  .replace(/(-\s*)(\d{1,2})(3304\d{4,})/g, '$1$2 $3')
  // 2. Also split any standalone 8-digit HSN starting with 3304 that's attached to other numbers
  .replace(/(\b3304\d{4})(\d+)/g, '$1 $2');
console.log("\nFixed line:", fixedFullRowText);

const delimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i);
console.log("\nDelimiter match:", delimiterMatch ? delimiterMatch[0] : 'No match');

let titleStr = fixedFullRowText;
if (delimiterMatch) {
  titleStr = fixedFullRowText.substring(0, delimiterMatch.index).trim();
}
titleStr = titleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();
console.log("\nFinal title:", titleStr);
