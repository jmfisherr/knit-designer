const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

async function main() {
  console.log('Creating Ethereal test account...')
  const account = await nodemailer.createTestAccount()
  const smtpUrl = `smtp://${encodeURIComponent(account.user)}:${encodeURIComponent(account.pass)}@${account.smtp.host}:${account.smtp.port}`

  const env = {
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    DATABASE_URL: 'file:./dev.db',
    EMAIL_SERVER: smtpUrl,
    EMAIL_FROM: `Knit Designer <${account.user}>`,
  }

  const content = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
  fs.writeFileSync(path.resolve(process.cwd(), '.env.local'), content, 'utf8')
  console.log('Wrote .env.local with Ethereal SMTP creds and DATABASE_URL')
  console.log('\nEthereal account info:')
  console.log(' user: %s', account.user)
  console.log(' pass: %s', account.pass)
  console.log(' web:  https://ethereal.email/messages')
  console.log('\nRun: npx prisma db push && npm run dev')
}

main().catch(err => { console.error(err); process.exit(1) })
