const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extract() {
  const data = fs.readFileSync('backend/dj2.pdf');
  const result = await pdfParse(data);
  console.log(result.text);
}
extract().catch(console.error);
