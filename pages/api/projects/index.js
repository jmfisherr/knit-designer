import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'projects')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function sanitizeName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9-_ ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'untitled'
}

export default async function handler(req, res) {
  ensureDir(DATA_DIR)
  const session = await getServerSession(req, res, authOptions)

  if (req.method === 'POST') {
    if (!session) return res.status(401).json({ error: 'Authentication required' })
    const userDir = path.join(DATA_DIR, sanitizeName(session.user.email || session.user.name || session.user.sub))
    ensureDir(userDir)
    const id = Date.now().toString(36)
    const name = (req.body && req.body.name) ? String(req.body.name) : 'untitled'
    const safe = sanitizeName(name)
    const stem = `${id}-${safe}`
    const file = path.join(userDir, stem + '.json')
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2), 'utf8')
    res.status(201).json({ id: stem })
    return
  }

  // GET: list projects
  // If not authenticated, list top-level projects (legacy/public)
  if (!session) {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
    const list = files.map(f => ({ id: f.replace(/\.json$/, ''), name: f }))
    res.json(list)
    return
  }

  const userDir = path.join(DATA_DIR, sanitizeName(session.user.email || session.user.name || session.user.sub))
  ensureDir(userDir)
  const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'))
  const list = files.map(f => {
    const id = f.replace(/\.json$/, '')
    try {
      const data = JSON.parse(fs.readFileSync(path.join(userDir, f), 'utf8'))
      return { id, name: data && data.name ? data.name : id }
    } catch (err) {
      return { id, name: id }
    }
  })
  res.json(list)
}
