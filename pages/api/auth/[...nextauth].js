import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// NOTE:
// - Email (magic link) sign-in requires a database adapter (e.g. Prisma) and
//   appropriate env vars (DATABASE_URL) before enabling. To keep the demo
//   lightweight we only enable Google OAuth by default. See README for steps
//   to enable Email sign-in with an adapter.

const providers = []
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
}

// Enable Email provider only when EMAIL_SERVER + DATABASE_URL are present
if (process.env.EMAIL_SERVER && process.env.DATABASE_URL) {
  providers.push(EmailProvider({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
    // Custom send function logs Ethereal preview URL when available
    async sendVerificationRequest({ identifier: email, url, provider, token }) {
      // debug: log that we were called
      console.log('[nextauth][email] sendVerificationRequest for', email)
      const nodemailer = await import('nodemailer')
      const transport = nodemailer.createTransport(provider.server)
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

      // Log preview url for Ethereal and write the URL to a local file
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

// Debugging info (printed on server startup)
try {
  // eslint-disable-next-line no-console
  console.log('[nextauth] providers configured:', { google: !!(process.env.GOOGLE_CLIENT_ID), emailServer: !!process.env.EMAIL_SERVER, database: !!process.env.DATABASE_URL })
} catch (e) {}

export const authOptions = {
  providers,
  adapter: process.env.DATABASE_URL ? PrismaAdapter(prisma) : undefined,
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
