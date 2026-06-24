const pdfjsLib = require('pdfjs-dist');

async function extract() {
  const doc = await pdfjsLib.getDocument('lovely.pdf').promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  console.log(textContent.items.map(i => i.str).join(' '));
}
extract().catch(console.error);
