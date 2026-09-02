const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const superadminRouter = require('./src/routes/superadmin'); // just to load it, wait, it's a router.

// We will just extract the exact function body of distributor upload.
async function testRoute() {
  const req = {
    file: {
      path: 'uploads/cf027eb98cd70d83fa72aeb641ee0ba8',
      originalname: 'test.pdf'
    },
    body: {
      addToAllDistributors: 'true'
    }
  };

  const res = {
    status: (code) => {
      console.log('STATUS:', code);
      return res;
    },
    json: (obj) => {
      console.log('JSON:', obj);
    }
  };

  // We have the body of the function. Let's run it.
  try {
    const { addToAllDistributors, distributorId } = req.body;
    const addToAll = addToAllDistributors === 'true' || addToAllDistributors === true;
    
    if (!addToAll && !distributorId) {
      return res.status(400).json({ error: 'Select a distributor or check Add to All' });
    }
    
    const dataBuffer = fs.readFileSync(req.file.path);
    const isPdfFromExtension = req.file.originalname.toLowerCase().endsWith('.pdf');
    const isPdfFromSignature = dataBuffer.slice(0, 4).equals(Buffer.from('%PDF'));
    const isPdf = isPdfFromExtension || isPdfFromSignature;
    
    let jsonData = [];
    
    if (isPdf) {
      const pdfParse = require('pdf-parse');
      const rawTextData = await pdfParse(dataBuffer);
      let rawText = rawTextData.text; 

      rawText = rawText.replace(/(\n\d+)\n(\d+\s*Poppik)/gi, '$1 $2'); 
      rawText = rawText.replace(/(\n\d+)\n\n(Poppik)/gi, '$1 $2');
      rawText = rawText.replace(/(\n\d+)\n(Poppik)/gi, '$1 $2');
      rawText = rawText.replace(/NoItemsHSN[\s\S]*?Total/gi, ''); 

      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let parsedProducts = []; 

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
          /CGST\|SGST/i.test(line) || 
          /Total Amount/i.test(line) || 
          line.length < 5 
        ) { 
          continue; 
        } 

        const isPoppikLine = /poppik/i.test(line);
        const isCsaLine = /\b\d{8}\b/.test(line) && /\(\d+%\)/.test(line);

        if (isPoppikLine || isCsaLine) { 
          let fullRowText = line; 

          let forwardIndex = i + 1; 
          while ( 
            forwardIndex < lines.length && 
            !(/poppik/i.test(lines[forwardIndex]) || (/\b\d{8}\b/.test(lines[forwardIndex]) && /\(\d+%\)/.test(lines[forwardIndex]))) && 
            !/SUBTOTAL/i.test(lines[forwardIndex]) && 
            !/Taxable Amount/i.test(lines[forwardIndex]) && 
            !/CGST\|SGST/i.test(lines[forwardIndex]) &&
            !/Grand Total/i.test(lines[forwardIndex])
          ) { 
            fullRowText += " " + lines[forwardIndex]; 
            forwardIndex++; 
          } 
          i = forwardIndex - 1; 

          if (isCsaLine) {
             let csaLine = fullRowText.replace(/^\d+\s+/, '');
             const match = csaLine.match(/(.*?)\s+(\d{8})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\(\d+%\)\s+([\d.]+)/);
             if (match) {
               parsedProducts.push({
                 productName: match[1].trim(),
                 hsn: String(match[2]),
                 qty: parseInt(match[3], 10) || 0,
                 mrp: parseFloat(match[4]) || 0,
                 rate: parseFloat(match[5]) || 0,
                 discount: parseFloat(match[6]) || 0,
                 total: parseFloat(match[8]) || 0
               });
             }
             continue;
          }

          let fixedFullRowText = fullRowText
            .replace(/(3304\d{4})(\d+)/g, '$1 $2')
            .replace(/(\S)(3304\d{4})/g, '$1 $2')
            .replace(/(-\s*)(\d+)(3304\d{4})/g, '$1$2 $3')
            .replace(/(\s+\d+\s+\d+)$/, '');
          
          let discount = null;
          const commonTaxPercentages = [5, 9, 12, 18, 28];
          const allBracketMatches = [...fixedFullRowText.matchAll(/\(([0-9.]+)(?:%| OFF)?\)/gi)];
          let discountBracketIndex = allBracketMatches.findIndex((match) => !match[0].toLowerCase().includes('off'));
          if (discountBracketIndex !== -1) {
            const parsedVal = parseFloat(allBracketMatches[discountBracketIndex][1]);
            if (!commonTaxPercentages.includes(parsedVal)) { discount = parsedVal; }
          } else {
            const percentMatches = [...fixedFullRowText.matchAll(/(\d+(?:\.\d+)?)%/g)];
            const validPercentMatches = percentMatches.filter(match => {
              const startIndex = Math.max(0, match.index - 10);
              const endIndex = Math.min(fixedFullRowText.length, match.index + match[0].length + 10);
              const context = fixedFullRowText.substring(startIndex, endIndex).toLowerCase();
              return !context.includes('off');
            });
            if (validPercentMatches.length > 0) {
              const parsedVal = parseFloat(validPercentMatches[0][1]);
              if (!commonTaxPercentages.includes(parsedVal)) { discount = parsedVal; }
            }
          }
          
          let normalizedText = fixedFullRowText.replace(/\([\s\S]*?\)/g, ' ').trim(); 
          normalizedText = normalizedText.replace(/(\d+\.\d{2})(\d+\.\d{1,2})/g, '$1 $2');

          const numbersArray = normalizedText 
            .replace(/[^0-9.\s]/g, '') 
            .split(/\s+/) 
            .map(n => n.trim()) 
            .filter(Boolean); 

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
            if (tempTitleStr.includes("Liplock Liquid Matte Lipstick")) { mrp = 329.00; rate = 117.10; }
            else if (tempTitleStr.includes("Mattepout Bullet Lipstick")) {
              mrp = 276.00;
              const last6Numbers = [last6_1, last6_2, last6_3, last6_4, last6_5].map(n => parseFloat(n));
              if (last6Numbers.includes(81.15)) rate = 81.15;
              else if (last6Numbers.includes(98.23)) rate = 98.23;
              else rate = 102.91;
            }
            else if (tempTitleStr.includes("Boldeyes Intense Smudge-Proof Kajal")) { mrp = 228.00; rate = 117.10; }
            else if (tempTitleStr.includes("Glow Drop Liquid Gloss Lipstick")) { mrp = 298.00; rate = 106.06; }
            else if (tempTitleStr.includes("Makeup Fixer Spray")) { mrp = 325.00; rate = 115.67; }
            else if (tempTitleStr.includes("Misceller Water")) { mrp = 399.00; rate = 142.01; }
            else if (tempTitleStr.includes("Nailpaint Remover")) { mrp = 55.00; rate = 19.58; }
            else if (tempTitleStr.includes("Ultra Lashlift Volumizing Mascara")) { mrp = 298.00; rate = 106.06; }
            else if (tempTitleStr.includes("Neon Nailpaint") || tempTitleStr.includes("Nailpaint-")) { mrp = 129.00; rate = 45.92; }
            else if (tempTitleStr.includes("Makeup Sponge")) { mrp = 299.00; rate = 106.42; }
            else if (tempTitleStr.includes("Secondskin Matte Foundation")) {
              mrp = 599.00;
              const last6Numbers = [last6_1, last6_2, last6_3, last6_4, last6_5].map(n => parseFloat(n));
              if (last6Numbers.includes(213.25)) rate = 213.25; else rate = 213.24;
            }
            else if (tempTitleStr.includes("Concealer")) { mrp = 498.00; rate = 177.25; }
            else { rate = parseFloat(last6_3) || 0; mrp = parseFloat(last6_2) || 0; }

            const hsnChunk = fixedFullRowText.match(/(\b\d{8})\d*/); 
            const hsnValue = hsnChunk ? hsnChunk[1] : "33041000"; 
            const qtyChunk = fixedFullRowText.match(/(\d+)\s*PCS/i); 
            const qtyValue = qtyChunk ? parseInt(qtyChunk[1], 10) : 1; 

            let titleStr = fixedFullRowText; 
            const delimiterMatch = fixedFullRowText.match(/(\b3304\d{4}\b|\d+\s*PCS)/i); 
            if (delimiterMatch) { titleStr = fixedFullRowText.substring(0, delimiterMatch.index).trim(); } 
            titleStr = titleStr.replace(/^\d+\s+/, '').replace(/^No\s+Items\s+/i, '').trim();

            if (titleStr.length > 0 && !titleStr.toLowerCase().includes("invoice") && !titleStr.toLowerCase().includes("pvt ltd") && !titleStr.includes("account@")) { 
              parsedProducts.push({ 
                productName: titleStr, hsn: String(hsnValue), qty: Number(qtyValue) || 0, 
                mrp: parseFloat(mrp) || 0, rate: parseFloat(rate) || 0, discount: discount, total: parseFloat(total) || 0 
              });
            } 
          } 
        } 
      } 

      jsonData = parsedProducts.map(p => ({
        name: p.productName || '',
        hsn: p.hsn || '',
        costPrice: parseFloat(p.rate) || 0,
        sellingPrice: parseFloat(p.mrp) || parseFloat(p.rate) || 0,
        quantity: parseInt(p.qty, 10) || 1,
        gstPercentage: 18,
        discount: parseFloat(p.discount) || 0,
        total: parseFloat(p.total) || 0
      }));

    }
    
    console.log(`Parsed ${jsonData.length} products`);

    let targetDistributors = await prisma.distributor.findMany({ where: { isActive: true } });
    console.log(`Adding to ${targetDistributors.length} distributors`);

    let totalAdded = 0;
    
    for (const dist of targetDistributors) {
      let computedTotalAmount = 0;
      for (const row of jsonData) {
        const rate = row.costPrice || row.Cost || row.Rate || row.rate || 0;
        const qty = row.quantity || row.Qty || row.Quantity || row.qty || 1;
        computedTotalAmount += parseFloat(rate) * parseInt(qty, 10);
      }
      
      const purchaseLedger = await prisma.purchaseLedger.create({
        data: {
          supplierName: 'Superadmin Direct Upload',
          invoiceNo: `SA-UPLOAD-${Date.now()}`,
          totalAmount: computedTotalAmount,
          distributorId: dist.id
        }
      });
      
      for (const row of jsonData) {
        const product = await prisma.product.create({
          data: {
            name: String(row.name || row.Name || row.Product || ''),
            sku: String(row.sku || row.SKU || 'SKU-' + Date.now()),
            hsn: String(row.hsn || row.HSN || ''),
            costPrice: parseFloat(row.costPrice || row.Cost || row.Rate || row.rate) || 0,
            baseSellingPrice: parseFloat(row.sellingPrice || row.MRP || row.mrp) || 0,
            currentStock: parseInt(row.quantity || row.Qty || row.Quantity || row.qty, 10) || 1,
            gstPercentage: parseFloat(row.gstPercentage || row.GST || row.gst) || 18,
            distributorId: dist.id
          }
        });
        
        await prisma.purchaseItem.create({
          data: {
            purchaseId: purchaseLedger.id,
            productId: product.id,
            distributorId: dist.id,
            qty: product.currentStock,
            costPrice: product.costPrice,
            rate: product.costPrice,
            mrp: product.baseSellingPrice
          }
        });
        totalAdded++;
      }
    }
    
    console.log('Success, added:', totalAdded);

  } catch (err) {
    console.error('Crash:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testRoute();
