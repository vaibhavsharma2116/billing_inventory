import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extract PAN from GSTIN (characters 3 to 12)
const extractPan = (gstin) => {
  if (gstin && gstin.length >= 15) {
    return gstin.substring(2, 12);
  }
  return '-';
};

export const downloadInvoicePDF = (viewInvoice, user, isCSA = false) => {
  if (!viewInvoice) return;

  const doc = new jsPDF('p', 'pt', 'a4');

  // Headers
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const distName = isCSA 
    ? (user?.companyName || user?.name || "CSA") 
    : (viewInvoice.distributor?.companyName || user?.companyName || user?.name || "DISTRIBUTOR");
  doc.text(distName, 40, 40);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  let gstIn = '-';
  let phone = '-';
  let email = '-';
  let addressLine = '';
  
  if (isCSA) {
    gstIn = user?.gstIn || '-';
    phone = user?.phone || '-';
    email = user?.email || '-';
    const address = user?.address || '';
    const city = user?.city || '';
    addressLine = `${address} ${city ? city + ', ' : ''}Maharashtra`.trim();
  } else {
    gstIn = viewInvoice.distributor?.gstIn || user?.gstIn || '-';
    phone = viewInvoice.distributor?.phone || user?.phone || '-';
    email = viewInvoice.distributor?.email || user?.email || '-';
    const address = viewInvoice.distributor?.address || user?.address || '';
    const city = viewInvoice.distributor?.city || user?.city || '';
    addressLine = `${address} ${city ? city + ', ' : ''}Maharashtra`.trim();
  }

  doc.text(`PAN No: ${extractPan(gstIn)} | GSTIN: ${gstIn}`, 40, 55);
  doc.text(`Mobile: ${phone} | Email: ${email}`, 40, 70);
  doc.text(addressLine, 40, 85);

  // Right aligned "Tax Invoice" and "Original For Recipient"
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Tax Invoice", doc.internal.pageSize.width - 40, 40, { align: "right" });
  doc.setFontSize(10);
  doc.text("Original For Recipient", doc.internal.pageSize.width - 40, 55, { align: "right" });

  // Meta Banner
  doc.setFontSize(10);
  doc.text(`Invoice No: ${viewInvoice.invoiceNo || viewInvoice.id}`, 40, 110);
  doc.text(`Invoice Date: ${new Date(viewInvoice.createdAt || new Date()).toLocaleDateString()}`, 200, 110);
  
  // Bill To
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 40, 140);
  doc.setFont("helvetica", "normal");
  
  if (isCSA) {
    const billToAddress = viewInvoice.distributor?.address ? `${viewInvoice.distributor.address}${viewInvoice.distributor.city ? ', ' + viewInvoice.distributor.city : ''}` : (viewInvoice.distributor?.city || '-');
    
    doc.text(viewInvoice.distributor?.companyName || viewInvoice.distributor?.name || '-', 40, 155);
    doc.text(`GSTIN: ${viewInvoice.distributor?.gstIn || '-'}`, 40, 170);
    doc.text(`Mobile: ${viewInvoice.distributor?.phone || '-'}`, 40, 185);
    doc.text(`Address: ${billToAddress}`, 40, 200);

    // Ship To
    doc.setFont("helvetica", "bold");
    doc.text("Ship To:", doc.internal.pageSize.width / 2 + 20, 140);
    doc.setFont("helvetica", "normal");
    doc.text(viewInvoice.distributor?.companyName || viewInvoice.distributor?.name || '-', doc.internal.pageSize.width / 2 + 20, 155);
    doc.text(`GSTIN: ${viewInvoice.distributor?.gstIn || '-'}`, doc.internal.pageSize.width / 2 + 20, 170);
    doc.text(`Address: ${billToAddress}`, doc.internal.pageSize.width / 2 + 20, 185);
  } else {
    const billToAddress = viewInvoice.party?.address ? `${viewInvoice.party.address}${viewInvoice.party.city ? ', ' + viewInvoice.party.city : ''}` : (viewInvoice.party?.city || '-');

    doc.text(viewInvoice.party?.name || '-', 40, 155);
    doc.text(`GSTIN: ${viewInvoice.party?.gstin || '-'}`, 40, 170);
    doc.text(`Mobile: ${viewInvoice.party?.phone || '-'}`, 40, 185);
    doc.text(`Address: ${billToAddress}`, 40, 200);

    // Ship To
    doc.setFont("helvetica", "bold");
    doc.text("Ship To:", doc.internal.pageSize.width / 2 + 20, 140);
    doc.setFont("helvetica", "normal");
    doc.text(viewInvoice.party?.name || '-', doc.internal.pageSize.width / 2 + 20, 155);
    doc.text(`GSTIN: ${viewInvoice.party?.gstin || '-'}`, doc.internal.pageSize.width / 2 + 20, 170);
    doc.text(`Address: ${billToAddress}`, doc.internal.pageSize.width / 2 + 20, 185);
  }

  // Items table
  const tableColumn = ["No", "Product", "HSN No.", "MRP", "Qty", "Rate", "Margin %", "Taxable", "GST %", "Total"];
  const tableRows = [];

  const items = viewInvoice.invoiceItems || viewInvoice.items || [];
  
  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let grandTotal = 0;

  items.forEach((item, idx) => {
    const mrp = parseFloat(item.mrp) || parseFloat(item.product?.baseSellingPrice) || 0;
    const rateWithGst = parseFloat(item.rate) || 0;
    const qty = parseInt(item.qty) || 0;
    const extraMarginPercentage = parseFloat(item.extraMarginPercentage) || 0;
    const gstPercent = parseFloat(item.product?.gstPercentage) || parseFloat(item.gstPercentage) || 0;

    const rateExcludingGst = rateWithGst / (1 + (gstPercent / 100));
    const taxableAfterMargin = rateExcludingGst * qty;
    const taxAmt = taxableAfterMargin * (gstPercent / 100);
    const itemTotal = taxableAfterMargin + taxAmt;

    const cgstAmt = taxAmt / 2;
    const sgstAmt = taxAmt / 2;
    
    totalTaxable += taxableAfterMargin;
    totalCGST += cgstAmt;
    totalSGST += sgstAmt;
    grandTotal += itemTotal;

    const itemData = [
      ` ${idx + 1} `,
      ` ${item.productName || item.product?.name || '-'} `,
      ` ${item.hsn || item.product?.hsn || '-'} `,
      ` ${mrp.toFixed(2)} `,
      ` ${qty} `,
      ` ${rateWithGst.toFixed(2)} `,
      ` ${extraMarginPercentage}% `,
      ` ${taxableAfterMargin.toFixed(2)} `,
      ` ${gstPercent}% `,
      ` ${itemTotal.toFixed(2)} `
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 210,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [205, 168, 79], textColor: [255, 255, 255] },
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  
  // Use calculated totals or fallback to saved ones
  const finalTaxable = totalTaxable > 0 ? totalTaxable : parseFloat(viewInvoice.taxableValue || 0);
  const finalCgst = totalCGST > 0 ? totalCGST : (parseFloat(viewInvoice.cgst || 0) + parseFloat(viewInvoice.igst || 0)/2);
  const finalSgst = totalSGST > 0 ? totalSGST : (parseFloat(viewInvoice.sgst || 0) + parseFloat(viewInvoice.igst || 0)/2);
  const finalGrandTotal = grandTotal > 0 ? grandTotal : parseFloat(viewInvoice.grandTotal || 0);

  doc.text(`Taxable Amount: Rs. ${finalTaxable.toFixed(2)}`, doc.internal.pageSize.width - 40, finalY, { align: "right" });
  
  // Always show CGST and SGST instead of IGST as requested
  doc.text(`CGST: Rs. ${finalCgst.toFixed(2)}`, doc.internal.pageSize.width - 40, finalY + 15, { align: "right" });
  doc.text(`SGST: Rs. ${finalSgst.toFixed(2)}`, doc.internal.pageSize.width - 40, finalY + 30, { align: "right" });
  
  doc.text(`Grand Total: Rs. ${finalGrandTotal.toFixed(2)}`, doc.internal.pageSize.width - 40, finalY + 45, { align: "right" });

  doc.save(`Invoice_${viewInvoice.invoiceNo || 'New'}.pdf`);
};
