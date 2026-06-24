
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const pdfPath = path.join(__dirname, 'PREMPAN_CHEMVET_PHARMA_Invoice_PL_SL_26_27_9.pdf');

async function testDetailedPDF() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const rawTextData = await pdfParse(dataBuffer);
    let rawText = rawTextData.text;
    
    console.log('=== DETAILED PDF TEST ===');

    // --- STEP 1: LAYOUT HEALING --- 
    rawText = rawText.replace(/(\n\d+)\n(\d+\s*Poppik)/gi, '$1 $2'); 
    rawText = rawText.replace(/(\n\d+)\n\n(Poppik)/gi, '$1 $2');
    rawText = rawText.replace(/(\n\d+)\n(Poppik)/gi, '$1 $2');
    rawText = rawText.replace(/NoItemsHSN[\s\S]*?Total/gi, ''); 
    
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean); 
    let parsedProducts = []; 

    for (let i = 0; i < lines.length; i++) { 
      let line = lines[i]; 
      if (
        /Sky Lark/i.test(line) || 
        /Invoice No/i.test(line) || 
        /Bill To/i.test(line) || 
        /PREMPAN/i.test(line) || 
        /SUBTOTAL/i.test(line) || 
        /TAX INVOICE/i.test(line) || 
        /Taxable Amount/i.test(line) || 
        /CGST|SGST/i.test(line) || 
        /Total Amount/i.test(line) || 
        /POPPIK LIFESTYLE PVT LTD/i.test(line) || 
        /Pan No/i.test(line) ||
        /account@/i.test(line) ||
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

        // OUR FIXES!
        let fixedFullRowText = fullRowText
          // 1. Split ANY number of digits that have an 8-digit HSN (starting with 3304) after them
          .replace(/(-\s*)(\d+)(3304\d{4})/g, '$1$2 $3')
          .replace(/(\b3304\d{4})(\d+)/g, '$1 $2')
          .replace(/(\s+\d+\s+\d+)$/, '');
        
        let discount = null;
        const allBrackets = [...fixedFullRowText.matchAll(/\(([0-9.]+)(?:%| OFF)?/gi)];
        let discountBracketIndex = allBrackets.findIndex((match) => !match[0].toLowerCase().includes('off'));
        if (discountBracketIndex === -1) {
          if (allBrackets.length >= 2) {
            discountBracketIndex = 1;
          }
        }
        if (discountBracketIndex !== -1) {
          discount = parseFloat(allBrackets[discountBracketIndex][1]);
        }

        let normalizedText = fixedFullRowText.replace(/\([\s\S]*?\)/g, ' ').trim(); 
        normalizedText = normalizedText.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');
        
        const processedMetrics = normalizedText;
        const numbersArray = processedMetrics.replace(/[^0-9.\s]/g, '').split(/\s+/).map(n => n.trim()).filter(Boolean);
        
        let total = 0, rate = 0, mrp = 0;
        if (numbersArray.length >= 6) {
          const [last6_1, last6_2, last6_3, last6_4, last6_5, last6_6] = numbersArray.slice(-6);
          total = parseFloat(last6_6.replace(/,/g, '')) || 0;
          rate = parseFloat(last6_3) || 0;
          mrp = parseFloat(last6_2) || 0;
        }

        console.log('\n--- ITEM ' + (parsedProducts.length + 1) + ' ---');
        console.log('Full Row Text:', fullRowText);
        console.log('Numbers Array:', numbersArray);
        console.log('MRP:', mrp);
        console.log('Rate:', rate);
        console.log('Total:', total);

        const hsnChunk = fixedFullRowText.match(/(\b\d{8})\d*/); 
        const hsnValue = hsnChunk ? hsnChunk[1] : "33041000"; 
        const qtyChunk = fixedFullRowText.match(/(\d+)\s*PCS/i); 
        const qtyValue = qtyChunk ? parseInt(qtyChunk[1], 10) : 1; 

        let titleStr = fixedFullRowText; 
        const delimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i); 
        if (delimiterMatch) { 
          titleStr = fixedFullRowText.substring(0, delimiterMatch.index).trim(); 
        } 

        titleStr = titleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();
        
        if (titleStr.length > 0 && !titleStr.toLowerCase().includes("invoice") && !titleStr.toLowerCase().includes("pvt ltd") && !titleStr.includes("account@")) { 
          parsedProducts.push({ 
            productName: titleStr, 
            hsn: hsnValue, 
            qty: qtyValue, 
            mrp, rate, 
            discount, 
            total 
          }); 
        } 
      } 
    } 
    
    console.log('\n=== FINISHED PDF PARSE ===');
    console.log(`Total products found: ${parsedProducts.length}`);
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
  }
}

testDetailedPDF();
