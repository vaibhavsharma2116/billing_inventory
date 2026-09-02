const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const getNum = (val) => {
  if (typeof val === 'number') return val;
  if (val?.toNumber) return val.toNumber();
  return parseFloat(val) || 0;
};

// GET /api/reports/distributor/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId;
    if (!distributorId) return res.status(403).json({ error: 'Not a distributor' });

    const today = new Date();
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // 1. Total Sales (This Month vs Last Month)
    const thisMonthInvoices = await prisma.invoice.findMany({
      where: { distributorId, createdAt: { gte: firstDayThisMonth } },
      select: { createdAt: true, grandTotal: true, party: { select: { name: true } } }
    });
    const lastMonthInvoices = await prisma.invoice.findMany({
      where: { distributorId, createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } },
      select: { createdAt: true, grandTotal: true }
    });

    const thisMonthSales = thisMonthInvoices.reduce((acc, inv) => acc + getNum(inv.grandTotal), 0);
    const lastMonthSales = lastMonthInvoices.reduce((acc, inv) => acc + getNum(inv.grandTotal), 0);
    const salesGrowth = lastMonthSales === 0 ? 100 : ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;

    // Projected Sales
    const daysPassedThisMonth = today.getDate();
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projectedSales = daysPassedThisMonth > 0 ? (thisMonthSales / daysPassedThisMonth) * totalDaysInMonth : 0;

    // Avg Sales Per Invoice
    const avgSales = thisMonthInvoices.length > 0 ? thisMonthSales / thisMonthInvoices.length : 0;

    // 2. Daily Sales Comparison (Day 1 to 31)
    const dailySalesMap = {};
    for (let i = 1; i <= 31; i++) {
      dailySalesMap[i] = { day: i, currentMonth: 0, lastMonth: 0 };
    }

    thisMonthInvoices.forEach(inv => {
      const day = new Date(inv.createdAt).getDate();
      dailySalesMap[day].currentMonth += getNum(inv.grandTotal);
    });
    
    lastMonthInvoices.forEach(inv => {
      const day = new Date(inv.createdAt).getDate();
      dailySalesMap[day].lastMonth += getNum(inv.grandTotal);
    });

    const dailySales = Object.values(dailySalesMap);

    // 3. Sales by Party (Doughnut & Bar)
    const partySalesMap = {};
    thisMonthInvoices.forEach(inv => {
      const pName = inv.party?.name || 'Unknown';
      partySalesMap[pName] = (partySalesMap[pName] || 0) + getNum(inv.grandTotal);
    });
    
    const partyWiseSales = Object.keys(partySalesMap)
      .map(name => ({ name, value: partySalesMap[name] }))
      .sort((a, b) => b.value - a.value);

    const topSellingParties = partyWiseSales.slice(0, 8); // For Doughnut
    const lowSellingParties = partyWiseSales.slice(-5).reverse(); // For Bottom Bar

    // 4. Product Performance & Item Groups
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { distributorId, createdAt: { gte: firstDayThisMonth } },
      include: { product: { select: { name: true } } }
    });

    const productSalesMap = {};
    const itemGroupMap = {};
    
    invoiceItems.forEach(item => {
      const pName = item.product?.name || 'Unknown';
      productSalesMap[pName] = (productSalesMap[pName] || 0) + item.qty;
      
      // Extract first word as "Item Group" (e.g. "Liplock Liquid Matte Lipstick" -> "Liplock")
      const firstWord = pName.split(' ')[0] || 'Other';
      itemGroupMap[firstWord] = (itemGroupMap[firstWord] || 0) + getNum(item.total);
    });

    const productPerformance = Object.keys(productSalesMap)
      .map(name => ({ name, qty: productSalesMap[name] }))
      .sort((a, b) => b.qty - a.qty);

    const lowSellingProducts = productPerformance.slice(-5).reverse();

    const itemGroupSales = Object.keys(itemGroupMap)
      .map(name => ({ name, value: itemGroupMap[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.json({
      thisMonthSales,
      lastMonthSales,
      salesGrowth: parseFloat(salesGrowth.toFixed(2)),
      projectedSales: parseFloat(projectedSales.toFixed(2)),
      avgSales: parseFloat(avgSales.toFixed(2)),
      dailySales,
      topSellingParties,
      lowSellingParties,
      itemGroupSales,
      lowSellingProducts
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/reports/distributor/inventory
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId;
    if (!distributorId) return res.status(403).json({ error: 'Not a distributor' });

    const products = await prisma.product.findMany({
      where: { distributorId },
      orderBy: { name: 'asc' }
    });

    let totalPurchaseValue = 0;
    let totalRetailValue = 0;
    let totalStock = 0;

    const inventory = products.map(p => {
      const costPrice = getNum(p.costPrice);
      const retailPrice = getNum(p.baseSellingPrice);
      const purchaseValue = p.currentStock * costPrice;
      const retailValue = p.currentStock * retailPrice;

      totalPurchaseValue += purchaseValue;
      totalRetailValue += retailValue;
      totalStock += p.currentStock;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentStock: p.currentStock,
        costPrice,
        retailPrice,
        purchaseValue,
        retailValue
      };
    });

    res.json({
      inventory,
      summary: {
        totalStock,
        totalPurchaseValue,
        totalRetailValue
      }
    });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ error: 'Failed to fetch inventory report' });
  }
});

// GET /api/reports/distributor/returns
router.get('/returns', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId;
    if (!distributorId) return res.status(403).json({ error: 'Not a distributor' });

    const salesReturns = await prisma.salesReturn.findMany({
      where: { distributorId },
      include: { party: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      salesReturns: salesReturns.map(sr => ({
        id: sr.id,
        returnNo: sr.returnNo,
        partyName: sr.party?.name || 'Unknown',
        totalAmount: getNum(sr.grandTotal),
        date: sr.createdAt
      })),
      purchaseReturns: purchaseReturns.map(pr => ({
        id: pr.id,
        returnNo: pr.returnNo,
        supplierName: pr.supplierName,
        totalAmount: getNum(pr.grandTotal),
        date: pr.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching return reports:', error);
    res.status(500).json({ error: 'Failed to fetch return reports' });
  }
});

// GET /api/reports/distributor/registers
router.get('/registers', authenticateToken, async (req, res) => {
  try {
    const distributorId = req.user.distributorId;
    if (!distributorId) return res.status(403).json({ error: 'Not a distributor' });

    const invoices = await prisma.invoice.findMany({
      where: { distributorId },
      include: { party: { select: { name: true, gstin: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const purchases = await prisma.purchaseLedger.findMany({
      where: { distributorId },
      include: { targetCsa: { select: { name: true, gstin: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      salesRegister: invoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        date: inv.createdAt,
        partyName: inv.party?.name || 'Unknown',
        gstin: inv.party?.gstin || '-',
        taxAmount: getNum(inv.cgst) + getNum(inv.sgst) + getNum(inv.igst),
        totalAmount: getNum(inv.grandTotal)
      })),
      purchaseRegister: purchases.map(pur => ({
        invoiceNo: pur.invoiceNo,
        date: pur.createdAt,
        supplierName: pur.targetCsa?.name || pur.supplierName || 'Unknown',
        gstin: pur.targetCsa?.gstin || '-',
        status: pur.status,
        totalAmount: getNum(pur.totalAmount)
      }))
    });
  } catch (error) {
    console.error('Error fetching registers:', error);
    res.status(500).json({ error: 'Failed to fetch registers' });
  }
});

module.exports = router;
