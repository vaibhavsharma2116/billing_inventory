const bcrypt = require('bcrypt')

async function testPassword() {
  try {
    // Let's test with rajiv's password hash
    const rajivHash = '$2b$10$hns.KjaF8UFMu5DE7mOtEeho2TiUu8NqBAdJmvmontmrb2Rj0WMaW'
    console.log('Testing possible passwords for rajiv...')
    
    const possiblePasswords = ['rajiv123', '123456', 'password', 'test', 'vaibhav']
    for (const pwd of possiblePasswords) {
      const match = await bcrypt.compare(pwd, rajivHash)
      console.log(`  Password "${pwd}": ${match ? '✅ MATCH' : '❌ NO'}`)
    }

    // Let's also test Vaibhav's hash
    const vaibhavHash = '$2b$10$FrO5PoWTjO.9gRGMgQIV1utWGFXkkgqVySLlFOQGDSzUiFYFWim4y'
    console.log('\nTesting possible passwords for Vaibhav...')
    for (const pwd of possiblePasswords) {
      const match = await bcrypt.compare(pwd, vaibhavHash)
      console.log(`  Password "${pwd}": ${match ? '✅ MATCH' : '❌ NO'}`)
    }

  } catch (err) {
    console.error(err)
  }
}

testPassword()
