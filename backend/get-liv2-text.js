
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function getLiv2Text() {
  const filePath = path.join(__dirname, 'liv2.pdf');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  console.log("LIV2 PDF RAW TEXT:");
  console.log(data.text);
}

getLiv2Text().catch(err => console.error("Error:", err));
