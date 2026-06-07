const prisma = require('./src/lib/prisma')
const bcrypt = require('bcrypt')

async function fixRoles() {
  try {
    console.log('🔍 Checking users in database...')

    // Find or create the super admin
    const superAdminEmail = 'superadmin@example.com'
    let superAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail }
    })

    if (!superAdmin) {
      console.log('⚠️  Super admin not found, creating one...')
      const hashedPassword = await bcrypt.hash('superadmin123', 10)
      superAdmin = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: superAdminEmail,
          password: hashedPassword,
          role: 'SUPER_ADMIN'
        }
      })
      console.log('✅ Super admin created!')
    } else if (superAdmin.role !== 'SUPER_ADMIN') {
      console.log('⚠️  Updating super admin role to SUPER_ADMIN...')
      superAdmin = await prisma.user.update({
        where: { email: superAdminEmail },
        data: { role: 'SUPER_ADMIN' }
      })
      console.log('✅ Super admin role updated!')
    } else {
      console.log('✅ Super admin is already SUPER_ADMIN!')
    }

    // Check all other users
    console.log('🔍 Checking other users...')
    const allUsers = await prisma.user.findMany()
    let updatedCount = 0

    for (const user of allUsers) {
      if (user.email !== superAdminEmail) {
        // Users with distributorId should be ADMIN
        if (user.distributorId && user.role !== 'ADMIN') {
          console.log(`Updating ${user.email} from ${user.role} to ADMIN...`)
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
          })
          updatedCount++
        }
        // Users without distributorId can be USER
        else if (!user.distributorId && user.role !== 'USER') {
          console.log(`Updating ${user.email} from ${user.role} to USER...`)
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'USER' }
          })
          updatedCount++
        }
      }
    }

    console.log(`\n✅ Done! Updated ${updatedCount} users!`)

    // Final summary
    const finalUsers = await prisma.user.findMany()
    console.log('\n📊 Final User Roles:')
    finalUsers.forEach(user => {
      console.log(`  - ${user.email}: ${user.role} (distributorId: ${user.distributorId || 'none'})`)
    })

  } catch (error) {
    console.error('❌ Error fixing roles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixRoles()
