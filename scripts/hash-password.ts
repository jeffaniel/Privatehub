import bcrypt from 'bcryptjs'

async function generateHash() {
  const password = 'your_strong_password_here' // Replace with your password
  const hash = await bcrypt.hash(password, 10)
  console.log('Password hash:', hash)
  console.log('Update your SQL insert with this hash')
}

generateHash().catch(console.error)