
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function savePDFText() {
  const filePath = path.join(__dirname, 'PREMPAN_CHEMVET_PHARMA_Invoice_PL_SL_26_27_9.pdf');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  fs.writeFileSync(path.join(__dirname, 'pdf-text-output.txt'), data.text);
  console.log('Saved PDF text to pdf-text-output.txt!');
  console.log('\nFirst 5000 characters:\n', data.text.substring(0, 5000));
}

savePDFText().catch(err => console.error('Error:', err));
