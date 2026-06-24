
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function debugRows() {
  const filePath = path.join(__dirname, 'PREMPAN_CHEMVET_PHARMA_Invoice_PL_SL_26_27_9.pdf');
  const dataBuffer = fs.readFileSync(filePath);
  const rawTextData = await pdfParse(dataBuffer);
  const rawText = rawTextData.text;
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  // Find the line with "Makeup Fixer Spray"
  for (let i=0; i<lines.length; i++) {
    if (lines[i].includes("Makeup Fixer")) {
      console.log("\nFound line index:", i);
      console.log("Line:", lines[i]);
      console.log("Next lines:", lines.slice(i, i+5));
    }
  }
}
debugRows().catch(err => console.error(err));
