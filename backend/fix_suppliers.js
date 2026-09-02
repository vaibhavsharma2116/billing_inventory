const fs = require('fs');
let fileContent = fs.readFileSync('src/routes/csa.js', 'utf8');

const oldCode = \    try {
      const csaId = req.user.userId
      
      // Get suppliers that are either:
      // 1. Directly linked to this CSA, OR
      // 2. Marked as isForAllCSAs
      const supplierRecords = await prisma.supplier.findMany({
        where: {
          OR: [
            { csaId },
            { isForAllCSAs: true }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
      
      const otherCSAs = await prisma.user.findMany({
        where: {
          role: 'CSA',
          id: { not: csaId }
        },
        select: {
          id: true,
          name: true,
          gstin: true
        }
      })
      
      const formattedCSAs = otherCSAs.map(c => ({
        id: c.id,
        name: c.name || 'Unnamed CSA',
        isCsa: true,
        isNameOnly: true // Tells frontend NOT to send supplierId, avoiding foreign key constraint with Supplier table
      }))
      
      res.json([...supplierRecords, ...formattedCSAs])
    } catch (error) {\;

const newCode = \    try {
      const csaId = req.user.userId
      
      // Get suppliers that are either:
      // 1. Directly linked to this CSA, OR
      // 2. Marked as isForAllCSAs
      const supplierRecords = await prisma.supplier.findMany({
        where: {
          OR: [
            { csaId },
            { isForAllCSAs: true }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
      
      res.json(supplierRecords)
    } catch (error) {\;

fileContent = fileContent.replace(oldCode, newCode);
fs.writeFileSync('src/routes/csa.js', fileContent);
console.log('Fixed');
