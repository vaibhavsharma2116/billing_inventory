
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const pdfPath = path.join(__dirname, 'PREMPAN_CHEMVET_PHARMA_Invoice_PL_SL_26_27_9.pdf');

async function testFullPDF() {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const rawTextData = await pdfParse(dataBuffer);
        let rawText = rawTextData.text;
        
        console.log('=== FULL PDF TEXT ===');
        console.log(rawText.substring(0, 5000)); // Print first 5000 chars to see structure
        console.log('\n=== PARSING ITEMS ===\n');

        // Layout Healing
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

                console.log('--- ITEM', parsedProducts.length + 1, '---');
                console.log('RAW ROW:', fullRowText);

                // Fix product variant and HSN
                let fixedFullRowText = fullRowText
                    .replace(/(-\s*)(\d+)(3304\d{4})/g, '$1$2 $3')
                    .replace(/(\b3304\d{4})(\d+)/g, '$1 $2')
                    .replace(/(\s+\d+\s+\d+)$/, '');
                console.log('FIXED ROW:', fixedFullRowText);

                // Extract Discount
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
                console.log('DISCOUNT:', discount);

                // Fix double-dot numbers
                let normalizedText = fixedFullRowText.replace(/\([\s\S]*?\)/g, ' ').trim();
                normalizedText = normalizedText.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');
                console.log('NORMALIZED:', normalizedText);

                // Extract numbers array
                const numbersArray = normalizedText
                    .replace(/[^0-9.\s]/g, '')
                    .split(/\s+/)
                    .map(n => n.trim())
                    .filter(Boolean);
                console.log('NUMBERS ARRAY:', numbersArray);

                let total = 0, rate = 0, mrp = 0, qty = 0, hsn = '';
                if (numbersArray.length >= 6) {
                    const [last6_1, last6_2, last6_3, last6_4, last6_5, last6_6] = numbersArray.slice(-6);
                    total = parseFloat(last6_6.replace(/,/g, '')) || 0;
                    rate = parseFloat(last6_3) || 0;
                    mrp = parseFloat(last6_2) || 0;
                    qty = parseFloat(last6_1) || 0;

                    // Extract HSN
                    const hsnMatch = fixedFullRowText.match(/3304\d{4}/);
                    hsn = hsnMatch ? hsnMatch[0] : '33041000';

                    // Extract Product Name
                    let titleStr = fixedFullRowText;
                    const delimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i);
                    if (delimiterMatch) {
                        titleStr = fixedFullRowText.substring(0, delimiterMatch.index).trim();
                    }
                    titleStr = titleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();

                    if (titleStr.length > 0) {
                        const product = {
                            id: parsedProducts.length + 1,
                            productName: titleStr,
                            hsn,
                            qty,
                            mrp,
                            rate,
                            discount,
                            total
                        };
                        parsedProducts.push(product);
                        console.log('PARSED:', JSON.stringify(product, null, 2));
                    }
                }
                console.log('---------------------------\n');
            }
        }

        console.log('=== TOTAL PARSED PRODUCTS:', parsedProducts.length, '===');
        console.log('\n=== SUMMARY TABLE ===');
        console.table(parsedProducts, ['id', 'productName', 'hsn', 'qty', 'mrp', 'rate', 'discount', 'total']);
    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

testFullPDF();
