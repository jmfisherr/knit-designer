import fs from 'fs'
import path from 'path'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'projects')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export default function handler(req, res) {
  ensureDir()
  if (req.method === 'POST') {
    const id = Date.now().toString(36)
    const file = path.join(DATA_DIR, id + '.json')
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2), 'utf8')
    res.status(201).json({ id })
    return
  }
  // GET: list
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  const list = files.map(f => ({ id: f.replace(/\.json$/, ''), name: f }))
  res.json(list)
}
