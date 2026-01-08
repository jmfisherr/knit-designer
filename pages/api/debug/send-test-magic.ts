import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
import fs from 'fs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = (req.query.email as string) || (req.body && (req.body.email as string))
  if (!email) return res.status(400).json({ error: 'email required' })

  try {
    const transport = nodemailer.createTransport(process.env.EMAIL_SERVER as string)
    const token = 'debug-' + Math.random().toString(36).slice(2)
    const url = `http://localhost:3000/api/auth/callback/email?token=${token}&email=${encodeURIComponent(email)}`
    const result = await transport.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: `Debug sign in to Knit Designer`,
      text: `Sign in: ${url}`,
      html: `<p>Sign in: <a href="${url}">${url}</a></p>`,
    })
    let preview: string | null = null
    try { preview = nodemailer.getTestMessageUrl(result) || null } catch (e) {}
    fs.writeFileSync(new URL('file:' + process.cwd() + '/.last_magic_link').pathname, url, 'utf8')
    res.json({ ok: true, preview, url })
  } catch (err: any) {
    console.error('send-test-magic error', err)
    res.status(500).json({ error: String(err) })
  }
}
