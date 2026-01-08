import fs from 'fs'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'projects')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function sanitizeName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9-_ ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'untitled'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  ensureDir(DATA_DIR)
  const { id } = req.query
  const session = await getServerSession(req, res, authOptions)

  // Resolve file path: if authenticated, files live in user dir; otherwise fallback to root
  const userIdentifier = session ? sanitizeName(session.user?.email || session.user?.name || (session.user as any)?.id) : null
  const userFile = userIdentifier ? path.join(DATA_DIR, userIdentifier, String(id) + '.json') : null
  const rootFile = path.join(DATA_DIR, String(id) + '.json')

  if (req.method === 'GET') {
    if (userFile && fs.existsSync(userFile)) {
      const data = fs.readFileSync(userFile, 'utf8')
      res.json(JSON.parse(data))
      return
    }
    if (fs.existsSync(rootFile)) {
      const data = fs.readFileSync(rootFile, 'utf8')
      res.json(JSON.parse(data))
      return
    }
    return res.status(404).json({ error: 'Not found' })
  }

  if (!session) return res.status(401).json({ error: 'Authentication required' })

  if (req.method === 'PUT') {
    try {
      const bodyName = req.body && req.body.name ? String(req.body.name) : null
      const parts = String(id).split('-')
      const uniq = parts[0]
      const safe = bodyName ? sanitizeName(bodyName) : null
      const newStem = safe ? `${uniq}-${safe}` : String(id)
      const userDir = path.join(DATA_DIR, userIdentifier!)
      ensureDir(userDir)
      const newFile = path.join(userDir, newStem + '.json')

      fs.writeFileSync(newFile, JSON.stringify(req.body, null, 2), 'utf8')
      // delete old file if it exists and has a different name
      const oldFile = path.join(userDir, String(id) + '.json')
      if (oldFile !== newFile && fs.existsSync(oldFile)) fs.unlinkSync(oldFile)
      res.json({ id: newStem, message: 'Updated' })
    } catch (err) {
      res.status(500).json({ error: 'Failed to update' })
    }
    return
  }

  if (req.method === 'DELETE') {
    const file = userFile
    if (file && fs.existsSync(file)) fs.unlinkSync(file)
    res.json({ message: 'Deleted' })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
