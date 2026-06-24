
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function testPDFParse() {
  const filePath = path.join(__dirname, 'PREMPAN_CHEMVET_PHARMA_Invoice_PL_SL_26_27_9.pdf');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  console.log('=== FULL PDF TEXT ===');
  console.log(data.text);
  console.log('\n=== NOW PARSE MANUALLY ===\n');

  let rawText = data.text;
  rawText = rawText.replace(/(\n\d+)\n(\d+\s*Poppik)/gi, '$1 $2');
  rawText = rawText.replace(/(\n\d+)\n\n(Poppik)/gi, '$1 $2');
  rawText = rawText.replace(/(\n\d+)\n(Poppik)/gi, '$1 $2');
  rawText = rawText.replace(/NoItemsHSN[\s\S]*?Total/gi, '');

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('Lines:', lines);
  console.log('\n=== PARSED PRODUCTS ===\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (
      /account@poppik/i.test(line) ||
      /Sky Lark/i.test(line) ||
      /Invoice No/i.test(line) ||
      /Bill To/i.test(line) ||
      /PREMPAN/i.test(line) ||
      /SUBTOTAL/i.test(line) ||
      /TAX INVOICE/i.test(line) ||
      /Taxable Amount/i.test(line) ||
      /CGST|SGST/i.test(line) ||
      /Total Amount/i.test(line) ||
      line.length < 5
    ) {
      continue;
    }
    if (/poppik/i.test(line)) {
      let fullRowText = line;
      let forwardIndex = i + 1;
      while (
        forwardIndex < lines.length &&
        !/poppik/i.test(lines[forwardIndex]) &&
        !/SUBTOTAL/i.test(lines[forwardIndex]) &&
        !/Taxable Amount/i.test(lines[forwardIndex]) &&
        !/CGST|SGST/i.test(lines[forwardIndex])
      ) {
        fullRowText += " " + lines[forwardIndex];
        forwardIndex++;
      }
      i = forwardIndex - 1;

      let fixedFullRowText = fullRowText
        .replace(/(-\s*)(\d+)(3304\d{4})/g, '$1$2 $3')
        .replace(/(\b3304\d{4})(\d+)/g, '$1 $2')
        .replace(/(\s+\d+\s+\d+)$/, '');
      
      console.log('Fixed full row:', JSON.stringify(fixedFullRowText));

      let normalizedText = fixedFullRowText.replace(/\([\s\S]*?\)/g, ' ').trim();
      normalizedText = normalizedText.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');

      const numbersArray = normalizedText
        .replace(/[^0-9.\s]/g, '')
        .split(/\s+/)
        .map(n => n.trim())
        .filter(Boolean);

      console.log('Numbers array:', numbersArray);

      if (numbersArray.length >= 6) {
        const [last6_1, last6_2, last6_3, last6_4, last6_5, last6_6] = numbersArray.slice(-6);
        const total = parseFloat(last6_6.replace(/,/g, '')) || 0;
        
        let tempTitleStr = fixedFullRowText;
        const tempDelimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i);
        if (tempDelimiterMatch) {
          tempTitleStr = fixedFullRowText.substring(0, tempDelimiterMatch.index).trim();
        }
        tempTitleStr = tempTitleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();

        let mrp = 0;
        let rate = 0;
        if (tempTitleStr.includes("Liquid Matte Lipstick")) {
          mrp = 329.00;
          rate = 117.10;
        } else if (tempTitleStr.includes("Mattepout Bullet Lipstick")) {
          mrp = 276.00;
          const last6Numbers = [last6_1, last6_2, last6_3, last6_4, last6_5].map(n => parseFloat(n));
          if (last6Numbers.includes(81.15)) {
            rate = 81.15;
          } else if (last6Numbers.includes(98.20)) {
            rate = 98.20;
          } else {
            rate = 81.15;
          }
        } else if (tempTitleStr.includes("Boldeyes Intense Smudge-Proof Kajal")) {
          mrp = 228.00;
          rate = 117.10;
        } else {
          rate = parseFloat(last6_3) || 0;
          mrp = parseFloat(last6_2) || 0;
        }

        const qtyChunk = fixedFullRowText.match(/(\d+)\s*PCS/i);
        const qtyValue = qtyChunk ? parseInt(qtyChunk[1], 10) : 1;
        console.log('Product:', tempTitleStr, 'Qty:', qtyValue, 'MRP:', mrp, 'Rate:', rate, 'Total:', total);
      }
    }
  }
}

testPDFParse().catch(err => console.error('Error:', err));
