import storage from './storage'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const downloadReturnPDF = (returnData, type = 'Sales Return') => {
  const doc = new jsPDF()

  // Get user details for Header
  const userStr = storage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}

  const poppikDetails = {
    name: 'POPPIK LIFESTYLE PVT LTD',
    pan: 'AAQCP0247B',
    gstin: '27AAQCP0247B1ZK',
    phone: '8655324379',
    email: 'account@poppik.in',
    address: '213 Sky Lark sector 11 belapur Thane , Thane, Maharashtra, 400614',
    web: 'www.poppiklifestyle.com'
  }

  // If user is SUPERADMIN or ADMIN, their own company is Poppik
  const isSuperadmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN'
  
  const headerDetails = {
    name: isSuperadmin ? poppikDetails.name : (user.companyName || user.name || 'Company Name'),
    pan: isSuperadmin ? poppikDetails.pan : (user.pan || ''),
    gstin: isSuperadmin ? poppikDetails.gstin : (user.gstin || ''),
    phone: isSuperadmin ? poppikDetails.phone : (user.phone || ''),
    email: isSuperadmin ? poppikDetails.email : (user.email || ''),
    address: isSuperadmin ? poppikDetails.address : (user.address || ''),
    web: isSuperadmin ? poppikDetails.web : ''
  }

  // Outer Border
  doc.setDrawColor(200, 180, 100) // Golden line color similar to image
  doc.setLineWidth(0.5)
  doc.rect(10, 10, 190, 277) 

  // --- HEADER (Top left) ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(40, 45, 90) // Dark blue
  doc.text(headerDetails.name.toUpperCase(), 14, 22)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  
  let headerX = 14
  if (headerDetails.pan) {
    doc.text(`Pan No`, headerX, 30)
    doc.setFont("helvetica", "normal")
    doc.text(headerDetails.pan, headerX + 13, 30)
    headerX += 45
  }
  if (headerDetails.gstin) {
    doc.setFont("helvetica", "bold")
    doc.text(`GSTIN`, headerX, 30)
    doc.setFont("helvetica", "normal")
    doc.text(headerDetails.gstin, headerX + 12, 30)
  }

  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  doc.text(`Phone: ${headerDetails.phone}    Email: ${headerDetails.email}`, 14, 38)
  doc.text(`Address: ${headerDetails.address}`, 14, 44)
  if (headerDetails.web) {
    doc.text(`Web: ${headerDetails.web}`, 14, 50)
  }

  // --- Top Right (Document Type) ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(40, 45, 90)
  doc.text(type.toUpperCase(), 140, 22)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.rect(140, 25, 45, 5)
  doc.text("ORIGINAL FOR RECIPIENT", 143, 28.5)

  // Divider 1
  doc.setDrawColor(200, 180, 100)
  doc.line(10, 54, 200, 54)

  // --- Dates Section ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text("Return No.", 14, 60)
  doc.text("Return Date", 60, 60)
  
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  doc.text(`${returnData.returnNo || returnData.id}`, 14, 66)
  const dateStr = new Date(returnData.createdAt || returnData.date).toLocaleDateString()
  doc.text(`${dateStr}`, 60, 66)

  // Divider 2
  doc.line(10, 70, 200, 70)

  // --- BILL TO / SHIP TO ---
  let billTo = {}
  let shipTo = {}

  if (type === 'Purchase Return') {
    // Purchase Return: Items returned TO supplier or CSA
    const csa = returnData.distributor?.csa;
    if (csa) {
      billTo = {
        name: csa.name || 'CSA',
        address: csa.city || '-',
        phone: csa.phone || '-',
        gstin: csa.gstin || '-',
        pan: csa.gstin ? csa.gstin.substring(2, 12) : '-'
      };
    } else {
      const s = returnData.supplier || returnData.distributor || {}
      if (s.name || s.companyName) {
        billTo = {
          name: s.companyName || s.name || 'Supplier',
          address: s.address || '-',
          phone: s.phone || '-',
          gstin: s.gstin || '-',
          pan: s.pan || '-'
        }
      } else {
        billTo = poppikDetails
      }
    }
    shipTo = { ...billTo }
  } else {
    // Sales Return: Items returned BY customer
    const p = returnData.party || returnData.distributor || {}
    billTo = {
      name: p.companyName || p.name || 'Customer',
      address: p.address || '-',
      phone: p.phone || '-',
      gstin: p.gstin || '-',
      pan: p.pan || '-'
    }
    shipTo = { ...billTo }
  }

  // Bill To block
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(40, 45, 90)
  doc.text("Bill To", 14, 76)
  
  doc.setFontSize(11)
  doc.text(billTo.name.toUpperCase(), 14, 82)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const billLines = doc.splitTextToSize(billTo.address, 80)
  doc.text(billLines, 14, 87)
  
  let currentY = 87 + (billLines.length * 4) + 1
  if (billTo.phone && billTo.phone !== '-') { doc.setFont("helvetica", "bold"); doc.text("Mobile: ", 14, currentY); doc.setFont("helvetica", "normal"); doc.text(billTo.phone, 26, currentY); currentY += 4.5 }
  if (billTo.gstin && billTo.gstin !== '-') { doc.setFont("helvetica", "bold"); doc.text("GSTIN: ", 14, currentY); doc.setFont("helvetica", "normal"); doc.text(billTo.gstin, 26, currentY); currentY += 4.5 }
  if (billTo.pan && billTo.pan !== '-') { doc.setFont("helvetica", "bold"); doc.text("PAN Number: ", 14, currentY); doc.setFont("helvetica", "normal"); doc.text(billTo.pan, 36, currentY); currentY += 4.5 }

  if (type === 'Purchase Return') {
    // Vertical line
    doc.setDrawColor(200, 180, 100)
    doc.line(100, 70, 100, 112)
    
    // Ship To block
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(40, 45, 90)
    doc.text("Ship To", 105, 76)
    
    doc.setFontSize(11)
    doc.text(shipTo.name.toUpperCase(), 105, 82)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    const shipLines = doc.splitTextToSize(shipTo.address, 80)
    doc.text(shipLines, 105, 87)
  }

  // End of header section
  doc.line(10, 112, 200, 112)

  // --- TABLE DATA ---
  const items = returnData.salesReturnItems || returnData.purchaseReturnItems || []
  
  const tableColumn = ["No", "Product", "HSN No.", "MRP", "Qty", "Rate", "Margin %", "Taxable", "GST %", "Total"]
  const tableRows = []

  let totalTaxable = 0
  let totalCGST = 0
  let totalSGST = 0
  let totalIGST = 0
  let grandTotal = 0

  items.forEach((item, index) => {
    const productName = item.product?.name || item.productName || 'Unknown Product'
    const hsn = item.product?.hsn || item.product?.hsnCode || '-'
    const qty = parseInt(item.qty) || 0
    const gstPercent = parseFloat(item.gstPercentage) || parseFloat(item.product?.gstPercentage) || 0
    
    // item.total in the DB is always the inclusive Grand Total for that item
    let itemTotal = parseFloat(item.total)
    let taxable = 0
    let rate = 0
    
    if (itemTotal > 0) {
      taxable = itemTotal / (1 + (gstPercent / 100))
      rate = parseFloat(item.rate) || parseFloat(item.costPrice) || parseFloat(item.unitPrice) || (qty > 0 ? itemTotal / qty : itemTotal)
    } else {
      // Fallback if total is missing
      rate = parseFloat(item.rate) || parseFloat(item.costPrice) || parseFloat(item.unitPrice) || 0
      itemTotal = qty * rate // Assuming rate is inclusive as per sales invoice logic
      taxable = itemTotal / (1 + (gstPercent / 100))
    }

    const gstAmount = itemTotal - taxable

    totalTaxable += taxable
    
    if (item.igst && parseFloat(item.igst) > 0) {
      totalIGST += gstAmount
    } else {
      totalCGST += gstAmount / 2
      totalSGST += gstAmount / 2
    }

    grandTotal += itemTotal

    const mrp = parseFloat(item.mrp || item.product?.mrp || item.product?.baseSellingPrice || 0).toFixed(2)
    const margin = item.extraMarginPercentage ? `${item.extraMarginPercentage}%` : '-'

    tableRows.push([
      (index + 1).toString(),
      productName,
      hsn,
      mrp,
      qty.toString(),
      rate.toFixed(2),
      margin,
      taxable.toFixed(2),
      `${gstPercent}%`,
      itemTotal.toFixed(2)
    ])
  })

  const finalTaxable = parseFloat(returnData.taxableValue || returnData.totalTaxable || totalTaxable).toFixed(2)
  const finalCGST = parseFloat(returnData.cgst || returnData.totalCGST || totalCGST).toFixed(2)
  const finalSGST = parseFloat(returnData.sgst || returnData.totalSGST || totalSGST).toFixed(2)
  const finalIGST = parseFloat(returnData.igst || returnData.totalIGST || totalIGST).toFixed(2)
  const finalGrandTotal = parseFloat(returnData.grandTotal || grandTotal).toFixed(2)

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 112,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 45, 90], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    tableLineColor: [200, 180, 100],
    tableLineWidth: 0.1
  })

  const finalY = doc.lastAutoTable.finalY || 130

  // --- Totals Section ---
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  
  let totalY = finalY + 10
  
  const totalGstAmount = parseFloat(finalCGST) + parseFloat(finalSGST) + parseFloat(finalIGST);
  const halfGstAmount = totalGstAmount / 2;

  doc.text(`Taxable Amount: Rs ${finalTaxable}`, 130, totalY)
  totalY += 6
  
  if (totalGstAmount > 0) {
    doc.text(`CGST: Rs ${halfGstAmount.toFixed(2)}`, 130, totalY)
    totalY += 6
    doc.text(`SGST: Rs ${halfGstAmount.toFixed(2)}`, 130, totalY)
    totalY += 6
  }

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`Grand Total: Rs ${finalGrandTotal}`, 130, totalY + 2)

  const filename = `${type.replace(/\s+/g, '_')}_${returnData.returnNo || returnData.id}.pdf`
  doc.save(filename)
}
