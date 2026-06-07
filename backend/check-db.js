const prisma = require('./src/lib/prisma')

async function checkDB() {
  try {
    console.log('=== DISTRIBUTORS ===')
    const distributors = await prisma.distributor.findMany({
      include: { users: true }
    })
    console.dir(distributors, { depth: null })

    console.log('\n=== USERS ===')
    const users = await prisma.user.findMany()
    console.dir(users, { depth: null })
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

checkDB()
