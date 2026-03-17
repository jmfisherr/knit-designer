import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const env = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '[SET]' : '[NOT SET]',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '[SET]' : '[NOT SET]',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '[SET]' : '[NOT SET]',
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
    EMAIL_SERVER: process.env.EMAIL_SERVER ? '[SET]' : '[NOT SET]',
    EMAIL_FROM: process.env.EMAIL_FROM,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
  }

  res.status(200).json(env)
}