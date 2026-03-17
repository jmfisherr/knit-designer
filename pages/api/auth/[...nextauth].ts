import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'

let PrismaAdapter: any = undefined
let prisma: any = undefined

// Only import Prisma-related code if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  try {
    const { PrismaAdapter: ImportedPrismaAdapter } = require('@next-auth/prisma-adapter')
    const { PrismaClient } = require('@prisma/client')
    PrismaAdapter = ImportedPrismaAdapter
    prisma = new PrismaClient()
  } catch (error) {
    console.error('[nextauth] Failed to initialize Prisma:', error)
  }
}

const providers = [] as any[]
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
}

if (process.env.EMAIL_SERVER && process.env.DATABASE_URL) {
  providers.push(EmailProvider({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
    async sendVerificationRequest({ identifier: email, url, provider, token }) {
      console.log('[nextauth][email] sendVerificationRequest for', email)
      const nodemailer = await import('nodemailer')
      const transport = nodemailer.createTransport(provider.server as any)
      let result
      try {
        result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to ${provider.name || 'Knit Designer'}`,
          text: `Sign in by clicking this link: ${url}`,
          html: `<p>Sign in by clicking <a href="${url}">${url}</a></p>`,
        })
      } catch (err) {
        console.error('[nextauth][email] sendMail error', err)
        throw err
      }

      try {
        const preview = nodemailer.getTestMessageUrl(result)
        if (preview) console.log('[nextauth][email] preview:', preview)
      } catch (e) { console.error('[nextauth][email] preview err', e) }

      try {
        const fs = await import('fs')
        const dest = new URL('file:' + process.cwd() + '/.last_magic_link').pathname
        fs.writeFileSync(dest, url, 'utf8')
        console.log('[nextauth][email] wrote .last_magic_link')
      } catch (e) { console.error('[nextauth][email] write err', e) }
    }
  }))
}

export const authOptions: NextAuthOptions = {
  providers: providers as any,
  adapter: prisma && PrismaAdapter ? PrismaAdapter(prisma) : undefined,
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}

// Set NEXTAUTH_URL dynamically for Vercel
if (process.env.VERCEL_URL && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
}

try {
  console.log('[nextauth] providers configured:', { google: !!process.env.GOOGLE_CLIENT_ID, emailServer: !!process.env.EMAIL_SERVER, database: !!process.env.DATABASE_URL })
  console.log('[nextauth] NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
  console.log('[nextauth] VERCEL_URL:', process.env.VERCEL_URL)
  console.log('[nextauth] Prisma available:', !!prisma)
} catch (e) {}

export default NextAuth(authOptions)
