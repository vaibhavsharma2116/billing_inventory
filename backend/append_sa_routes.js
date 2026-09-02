const fs = require('fs');

const appendText = `

// --- PURCHASE REQUESTS (CSA) ---
router.get('/purchase-requests/csa', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const requests = await prisma.purchaseLedger.findMany({
      where: {
        csaId: { not: null }
      },
      include: {
        csa: { select: { name: true, city: true } },
        purchaseItems: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    console.error('Error fetching purchase requests:', err);
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
});

router.put('/purchase-requests/csa/:id/approve', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the purchase ledger with items
    const purchaseLedger = await prisma.purchaseLedger.findUnique({
      where: { id },
      include: { purchaseItems: true }
    });

    if (!purchaseLedger || purchaseLedger.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order request not found or not in PENDING status' });
    }

    // Update stock for each item using a transaction
    await prisma.$transaction(async (prisma) => {
      for (const item of purchaseLedger.purchaseItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.qty }
          }
        });
      }
      
      // Mark ledger as APPROVED
      await prisma.purchaseLedger.update({
        where: { id },
        data: { status: 'APPROVED' }
      });
    });

    res.json({ message: 'Order approved successfully and stock updated' });
  } catch (err) {
    console.error('Error approving purchase request:', err);
    res.status(500).json({ error: 'Failed to approve order request' });
  }
});

router.put('/purchase-requests/csa/:id/reject', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.purchaseLedger.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Order rejected successfully' });
  } catch (err) {
    console.error('Error rejecting purchase request:', err);
    res.status(500).json({ error: 'Failed to reject order request' });
  }
});

module.exports = router;
`;

let content = fs.readFileSync('src/routes/superadmin.js', 'utf8');
content = content.replace('module.exports = router;', appendText);
fs.writeFileSync('src/routes/superadmin.js', content);
console.log('Appended Purchase Request routes successfully');
