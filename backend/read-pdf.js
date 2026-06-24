const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extract() {
  const file = process.argv[2] || 'backend/dj2.pdf';
  const data = fs.readFileSync(file);
  const result = await pdfParse(data);
  console.log('TEXT:', result.text);
}
extract().catch(console.error);
