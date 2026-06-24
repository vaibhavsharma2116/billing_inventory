
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function checkAllPDFs() {
  const pdfPaths = [
    'liv1.pdf',
    'liv2.pdf',
    'PREMPAN_CHEMVET_PHARMA_Invoice_PL_SL_26_27_9.pdf'
  ];
  
  for (const pdfPath of pdfPaths) {
    console.log(`\n\n=== Checking ${pdfPath} ===`);
    const filePath = path.join(__dirname, pdfPath);
    const dataBuffer = fs.readFileSync(filePath);
    const rawTextData = await pdfParse(dataBuffer);
    const rawText = rawTextData.text;
    const lines = rawText.split(/\r?\n/).filter(line => line.trim());
    console.log(`Number of lines: ${lines.length}`);
    lines.forEach((line, i) => {
      console.log(`${i}: ${line}`);
    });
  }
}

checkAllPDFs().catch(err => console.error('Error:', err));
