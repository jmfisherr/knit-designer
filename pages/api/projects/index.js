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
    const name = (req.body && req.body.name) ? String(req.body.name) : 'untitled'
    const safe = name.toLowerCase().replace(/[^a-z0-9-_ ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80)
    const stem = `${id}-${safe || 'untitled'}`
    const file = path.join(DATA_DIR, stem + '.json')
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2), 'utf8')
    res.status(201).json({ id: stem })
    return
  }
  // GET: list
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  const list = files.map(f => {
    const id = f.replace(/\.json$/, '')
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
      return { id, name: data && data.name ? data.name : id }
    } catch (err) {
      return { id, name: id }
    }
  })
  res.json(list)
}
