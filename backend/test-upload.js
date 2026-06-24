const fs = require('fs');
const pdfParse = require('pdf-parse');
const dataBuffer = fs.readFileSync('dj2.pdf');

async function testUpload() {
  let jsonDataWithHeaders = [];
  let invoiceMetadata = {};
  
  try {
    const rawTextData = await pdfParse(dataBuffer);
    console.log('=== FULL PDF TEXT ===');
    console.log(rawTextData.text);
    
    // Test the parsing
    let rawText = rawTextData.text; 
    rawText = rawText.replace(/(\n\d+)\n(\d+\s*Poppik)/gi, '$1 $2'); 
    rawText = rawText.replace(/(\n\d+)\n\n(Poppik)/gi, '$1 $2');
    rawText = rawText.replace(/(\n\d+)\n(Poppik)/gi, '$1 $2');
    rawText = rawText.replace(/NoItemsHSN[\s\S]*?Total/gi, ''); 
    
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    console.log('Lines length:', lines.length);
    
    let parsedProducts = []; 
    // loops, etc
    
  } catch (e) {
    console.error(e);
  }
}
testUpload();
