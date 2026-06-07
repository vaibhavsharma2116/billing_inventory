const prisma = require('./src/lib/prisma')
const bcrypt = require('bcrypt')

async function resetPasswords() {
  try {
    // Reset Vaibhav
    const vaibhavPwd = 'vaibhav123'
    const hashedVaibhav = await bcrypt.hash(vaibhavPwd, 10)
    console.log('🔑 Hashing vaibhav123...')
    console.log('   Hash:', hashedVaibhav)
    
    await prisma.user.update({
      where: { email: 'vaibhav@poppik.in' },
      data: { password: hashedVaibhav }
    })
    console.log('✅ Updated vaibhav@poppik.in password to:', vaibhavPwd)

    // Test verification
    const testVaibhav = await prisma.user.findUnique({
      where: { email: 'vaibhav@poppik.in' }
    })
    const testMatch = await bcrypt.compare(vaibhavPwd, testVaibhav.password)
    console.log('   Verification test:', testMatch ? '✅ MATCH' : '❌ NO')

    // Reset Rajiv
    const rajivPwd = 'rajiv123'
    const hashedRajiv = await bcrypt.hash(rajivPwd, 10)
    console.log('\n🔑 Hashing rajiv123...')
    console.log('   Hash:', hashedRajiv)
    
    await prisma.user.update({
      where: { email: 'vaibhavs@poppik.in' },
      data: { password: hashedRajiv }
    })
    console.log('✅ Updated vaibhavs@poppik.in password to:', rajivPwd)

    // Test verification
    const testRajiv = await prisma.user.findUnique({
      where: { email: 'vaibhavs@poppik.in' }
    })
    const testRajivMatch = await bcrypt.compare(rajivPwd, testRajiv.password)
    console.log('   Verification test:', testRajivMatch ? '✅ MATCH' : '❌ NO')

    console.log('\n🎉 Password reset complete!')

  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

resetPasswords()
