const prisma = require('./src/lib/prisma')
const bcrypt = require('bcrypt')

async function updatePasswords() {
  try {
    // Update Vaibhav's password to "vaibhav123"
    const hashedVaibhav = await bcrypt.hash('vaibhav123', 10)
    await prisma.user.update({
      where: { email: 'vaibhav@poppik.in' },
      data: { password: hashedVaibhav }
    })
    console.log('✅ Updated vaibhav@poppik.in password to: vaibhav123')

    // Update Rajiv's password to "rajiv123"
    const hashedRajiv = await bcrypt.hash('rajiv123', 10)
    await prisma.user.update({
      where: { email: 'vaibhavs@poppik.in' },
      data: { password: hashedRajiv }
    })
    console.log('✅ Updated vaibhavs@poppik.in password to: rajiv123')

  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

updatePasswords()
