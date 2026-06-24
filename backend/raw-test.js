const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser();
pdfParser.on('pdfParser_dataError', err => { console.error(err); });
pdfParser.on('pdfParser_dataReady', data => {
  console.log('PDF2JSON DATA:', JSON.stringify(data, null, 2));
});

const buffer = fs.readFileSync('ll.pdf');
pdfParser.parseBuffer(buffer);
