import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extract PAN from GSTIN (characters 3 to 12)
const extractPan = (gstin) => {
  if (gstin && gstin.length >= 15) {
    return gstin.substring(2, 12);
  }
  return '-';
};

export const downloadPurchaseReceiptPDF = (purchase, user) => {
  if (!purchase) return;

  const doc = new jsPDF('p', 'pt', 'a4');

  // Headers
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const companyName = user?.companyName || user?.name || "CSA";
  doc.text(companyName, 40, 40);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const gstIn = user?.gstin || user?.gstIn || '-';
  const phone = user?.phone || '-';
  const email = user?.email || '-';
  const address = user?.address || '';
  const city = user?.city || '';
  const addressLine = `${address} ${city ? city + ', ' : ''}Maharashtra`.trim();

  doc.text(`PAN No: ${extractPan(gstIn)} | GSTIN: ${gstIn}`, 40, 55);
  doc.text(`Mobile: ${phone} | Email: ${email}`, 40, 70);
  doc.text(addressLine, 40, 85);

  // Right aligned "Purchase Receipt"
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Purchase Receipt", doc.internal.pageSize.width - 40, 40, { align: "right" });
  doc.setFontSize(10);
  doc.text(`Status: ${purchase.status || 'APPROVED'}`, doc.internal.pageSize.width - 40, 55, { align: "right" });

  // Meta Banner
  doc.setFontSize(10);
  doc.text(`Order No: ${purchase.invoiceNo || purchase.id}`, 40, 110);
  doc.text(`Order Date: ${new Date(purchase.createdAt || new Date()).toLocaleDateString()}`, 200, 110);
  
  // Order From (Supplier)
  doc.setFont("helvetica", "bold");
  doc.text("Order To (Supplier):", 40, 140);
  doc.setFont("helvetica", "normal");
  
  const supName = purchase.supplierName || purchase.supplier?.name || purchase.targetCsa?.name || purchase.distributor?.csa?.name || 'SuperAdmin / Unknown';
  const supGstin = purchase.supplier?.gstin || purchase.supplier?.gstIn || purchase.targetCsa?.gstin || purchase.targetCsa?.gstIn || purchase.distributor?.csa?.gstin || purchase.distributor?.csa?.gstIn || '-';
  const supPhone = purchase.supplier?.phone || purchase.targetCsa?.phone || purchase.distributor?.csa?.phone || '-';
  const supAddressObj = purchase.supplier || purchase.targetCsa || purchase.distributor?.csa;
  const supAddress = supAddressObj?.address 
    ? `${supAddressObj.address}${supAddressObj.city ? ', ' + supAddressObj.city : ''}` 
    : (supAddressObj?.city || '-');

  doc.text(supName, 40, 155);
  doc.text(`GSTIN: ${supGstin}`, 40, 170);
  doc.text(`Mobile: ${supPhone}`, 40, 185);
  doc.text(`Address: ${supAddress}`, 40, 200);
  
  // Delivery To
  doc.setFont("helvetica", "bold");
  doc.text("Delivery To:", doc.internal.pageSize.width / 2 + 20, 140);
  doc.setFont("helvetica", "normal");
  doc.text(companyName, doc.internal.pageSize.width / 2 + 20, 155);
  doc.text(`Address: ${addressLine}`, doc.internal.pageSize.width / 2 + 20, 170);

  // Items table
  const tableColumn = ["No", "Product", "Qty", "Cost Price", "Total"];
  const tableRows = [];

  const items = purchase.purchaseItems || [];
  
  let grandTotal = 0;
  let totalQty = 0;

  items.forEach((item, idx) => {
    const qty = parseInt(item.qty) || 0;
    const costPrice = parseFloat(item.costPrice) || 0;
    const total = qty * costPrice;

    grandTotal += total;
    totalQty += qty;

    const itemData = [
      ` ${idx + 1} `,
      ` ${item.product?.name || item.productName || 'Unknown Product'} `,
      ` ${qty} `,
      ` ${costPrice.toFixed(2)} `,
      ` ${total.toFixed(2)} `
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 220,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 168, 205], textColor: [255, 255, 255] }, // different color for purchase receipt
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  
  doc.text(`Total Items Qty: ${totalQty}`, 40, finalY);
  
  const finalGrandTotal = grandTotal > 0 ? grandTotal : parseFloat(purchase.totalAmount || 0);
  doc.text(`Grand Total: Rs. ${finalGrandTotal.toFixed(2)}`, doc.internal.pageSize.width - 40, finalY, { align: "right" });

  doc.save(`Receipt_${purchase.invoiceNo || 'Order'}.pdf`);
};
