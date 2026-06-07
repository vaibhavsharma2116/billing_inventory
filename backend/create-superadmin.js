const prisma = require('./src/lib/prisma')
const bcrypt = require('bcrypt')

async function createSuperAdmin() {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: 'superadmin@example.com' }
    })

    if (existingUser) {
      console.log('Super admin already exists!')
      console.log('Email: superadmin@example.com')
      console.log('Password: superadmin123')
      process.exit(0)
    }

    const hashedPassword = await bcrypt.hash('superadmin123', 10)

    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@example.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    })

    console.log('✅ Super Admin created successfully!')
    console.log('Email: superadmin@example.com')
    console.log('Password: superadmin123')
    console.log('Please change the password after first login!')
  } catch (error) {
    console.error('Error creating super admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()
