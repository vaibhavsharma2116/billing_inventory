// Test the new pdf2json parser directly!
const fs = require('fs');
const PDFParser = require('pdf2json');
const pdfParse = require('pdf-parse');

async function test() {
  const filePath = 'ls.pdf';
  const dataBuffer = fs.readFileSync(filePath);
  console.log('=== READING BILL.PDF ===');

  // Test pdf-parse for metadata
  console.log('\n--- PDF-PARSE TEXT ---');
  const data = await pdfParse(dataBuffer);
  console.log(data.text);

  // Test pdf2json coordinate parsing!
  console.log('\n--- PDF2JSON COORDINATE PARSING ---');
  const pdfParser = new PDFParser();

  const parsePromise = new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', pdfData => resolve(pdfData));
    pdfParser.parseBuffer(dataBuffer);
  });

  const pdfData = await parsePromise;

  // Now do our parsing!
  const finalProductsList = [];
  let isTableZone = false;

  for (let pageIndex = 0; pageIndex < pdfData.Pages.length; pageIndex++) {
    const page = pdfData.Pages[pageIndex];
    console.log('\n===== PAGE', pageIndex+1, '=====');
    const textTokens = [];
    for (const text of page.Texts) {
      const textValue = decodeURIComponent(text.R[0].T);
      const x = text.x;
      const y = text.y;
      textTokens.push({ text: textValue, x, y });
    }

    const rows = [];
    const Y_THRESHOLD = 1.0;
    for (const token of textTokens) {
      let found = false;
      for (const row of rows) {
        if (Math.abs(row.y - token.y) < Y_THRESHOLD) {
          row.tokens.push(token);
          found = true;
          break;
        }
      }
      if (!found) {
        rows.push({ y: token.y, tokens: [token] });
      }
    }

    rows.sort((a,b) => a.y - b.y);
    for (const row of rows) {
      row.tokens.sort((a,b) => a.x - b.x);
    }

    for (const row of rows) {
      const lineText = row.tokens.map(t => t.text).join(' ').trim();
      const lowerLine = lineText.toLowerCase();

      if (isTableZone && (
        lowerLine.includes('subtotal') || lowerLine.includes('terms') || lowerLine.includes('taxable') ||
        lowerLine.includes('total amount') || lowerLine.includes('grand total') || lowerLine.includes('in words')
      )) {
        isTableZone = false;
        console.log('🛑 Footer found, stopping:', lineText);
        continue;
      }

      if (!isTableZone) {
        const hasAllHeaders = lowerLine.includes('no') && lowerLine.includes('items') &&
          (lowerLine.includes('hsn') || lowerLine.includes('hsn no')) && lowerLine.includes('qty') &&
          lowerLine.includes('mrp') && lowerLine.includes('rate') &&
          (lowerLine.includes('tax') || lowerLine.includes('gst')) && lowerLine.includes('total');

        if (hasAllHeaders) {
          isTableZone = true;
          console.log('✅ Table header found:', lineText);
        } else {
          const firstToken = row.tokens[0]?.text;
          if (firstToken && /^\d+$/.test(firstToken)) {
            let numericCount =0;
            for (const token of row.tokens) {
              if (/^[₹$€]?[\d,]+\.?\d*%?$/.test(token.text) || /^\d+(\.\d+)?(pcs|pcs\.|nos|no\.|qty)?$/i.test(token.text)) {
                numericCount++;
              }
            }
            if (numericCount >=3) {
              isTableZone = true;
              console.log('✅ Row looks like product, activating table zone:', lineText);
            }
          }
        }
        continue;
      }

      // Now parse row!
      const firstToken = row.tokens[0]?.text;
      const serialMatch = firstToken ? firstToken.match(/^(\d+)$/) : null;
      if (!serialMatch) continue;

      const tokensList = row.tokens.map(t => t.text).filter(t => t.trim());
      console.log('📜 Parsing row tokens:', tokensList);

      let currentIndex = tokensList.length - 1;
      let totalAmountToken = null, taxToken = null, discountToken = null,
          rateToken = null, mrpToken = null, qtyToken = null, hsnToken = null;
      let productNameTokens = [];

      if (currentIndex >= 0) {
        const num = parseFloat(tokensList[currentIndex].replace(/[₹$€%,]/g, ''));
        if (!isNaN(num)) {
          totalAmountToken = tokensList[currentIndex];
          currentIndex--;
        }
      }

      if (currentIndex >=0) { taxToken = tokensList[currentIndex]; currentIndex--; }

      if (currentIndex >=0) {
        const num = parseFloat(tokensList[currentIndex].replace(/[₹$€%,]/g, ''));
        if (!isNaN(num) || tokensList[currentIndex].toLowerCase().includes('%')) {
          discountToken = tokensList[currentIndex];
          currentIndex--;
        }
      }

      if (currentIndex >=0) {
        const num = parseFloat(tokensList[currentIndex].replace(/[₹$€%,]/g, ''));
        if (!isNaN(num)) {
          rateToken = tokensList[currentIndex];
          currentIndex--;
        }
      }

      if (currentIndex >=0) {
        const num = parseFloat(tokensList[currentIndex].replace(/[₹$€%,]/g, ''));
        if (!isNaN(num)) {
          mrpToken = tokensList[currentIndex];
          currentIndex--;
        }
      }

      if (currentIndex >=0) { qtyToken = tokensList[currentIndex]; currentIndex--; }

      if (currentIndex >=0) {
        if (/^\d{6,8}$/.test(tokensList[currentIndex])) {
          hsnToken = tokensList[currentIndex];
          currentIndex--;
        }
      }

      for (let i=1; i<=currentIndex; i++) {
        productNameTokens.push(tokensList[i]);
      }

      const totalAmount = totalAmountToken ? parseFloat(totalAmountToken.replace(/[₹$€%,]/g, '')) : NaN;
      const qty = qtyToken ? parseInt(qtyToken.match(/^(\d+)/)?.[1] || '1') : 1;

      if (isNaN(qty) || qty === 0 || isNaN(totalAmount) || totalAmount === 0) {
        console.log('❌ Invalid, skipping:', { totalAmount, qty });
        continue;
      }

      const rate = rateToken ? parseFloat(rateToken.replace(/[₹$€%,]/g, '')) : totalAmount / qty;
      const mrp = mrpToken ? parseFloat(mrpToken.replace(/[₹$€%,]/g, '')) : rate;
      let gstPercentage =0;
      if (taxToken) {
        const gstMatch = taxToken.match(/(\d+)%?/);
        if (gstMatch) { gstPercentage = parseInt(gstMatch[1]); }
      }

      if (!hsnToken) {
        for (const token of tokensList) {
          if (/^\d{6,8}$/.test(token)) {
            hsnToken = token;
            break;
          }
        }
      }

      finalProductsList.push({
        productName: productNameTokens.join(' ').trim(),
        hsn: hsnToken || '',
        costPrice: rate || mrp || 0,
        gstPercentage,
        quantity: qty
      });
    }
  }

  console.log('\n===== FINAL PRODUCTS LIST =====');
  console.log(JSON.stringify(finalProductsList, null, 2));
}

test().catch(err => {
  console.error('ERROR:', err);
});
