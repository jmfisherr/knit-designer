export default async function handler(req, res) {
  const email = req.query.email || req.body && req.body.email
  if (!email) return res.status(400).json({ error: 'email required' })

  try {
    const nodemailer = await import('nodemailer')
    const transport = nodemailer.createTransport(process.env.EMAIL_SERVER)
    const token = 'debug-' + Math.random().toString(36).slice(2)
    const url = `http://localhost:3000/api/auth/callback/email?token=${token}&email=${encodeURIComponent(email)}`
    const result = await transport.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: `Debug sign in to Knit Designer`,
      text: `Sign in: ${url}`,
      html: `<p>Sign in: <a href="${url}">${url}</a></p>`,
    })
    let preview = null
    try { preview = nodemailer.getTestMessageUrl(result) } catch (e) {}
    const fs = await import('fs')
    fs.writeFileSync(new URL('file:' + process.cwd() + '/.last_magic_link').pathname, url, 'utf8')
    res.json({ ok: true, preview, url })
  } catch (err) {
    console.error('send-test-magic error', err)
    res.status(500).json({ error: String(err) })
  }
}
