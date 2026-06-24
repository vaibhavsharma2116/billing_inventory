
const pdfParse = require('pdf-parse');
const fs = require('fs');

const pdfPath = 'liv1.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

pdfParse(dataBuffer).then(function(data) {
  console.log('=== FULL PDF TEXT ===');
  console.log(data.text);

  console.log('\n=== PDF LINES ===');
  const lines = data.text.split(/\r?\n/).filter(line => line.trim());
  lines.forEach((line, i) => {
    console.log(`${i}:`, JSON.stringify(line));
  });
}).catch(err => console.error(err));
