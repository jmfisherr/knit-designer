import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Non-sensitive debug endpoint to confirm server-side env detection for auth
  res.json({
    emailServer: !!process.env.EMAIL_SERVER,
    database: !!process.env.DATABASE_URL,
    nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    now: new Date().toISOString(),
  })
}
