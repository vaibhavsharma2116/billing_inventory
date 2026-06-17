const prisma = require('./src/lib/prisma')

async function main() {
  console.log('Checking user with id cmpz8fs9i0001izqrwp4h857p...')
  const user = await prisma.user.findUnique({
    where: { id: 'cmpz8fs9i0001izqrwp4h857p' }
  })

  if (user) {
    console.log('User found!')
    console.log('Name:', user.name)
    console.log('Role:', user.role)
    console.log('isActive:', user.isActive)
    console.log('distributorId:', user.distributorId)
    console.log('csaId:', user.csaId)
    console.log('adminId:', user.adminId)
    console.log('Full user data:', user)
  } else {
    console.log('User not found!')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })