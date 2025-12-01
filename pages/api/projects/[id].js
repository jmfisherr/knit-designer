import fs from 'fs'
import path from 'path'

const DATA_DIR = path.resolve(process.cwd(), 'data', 'projects')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export default function handler(req, res) {
  ensureDir()
  const { id } = req.query
  const file = path.join(DATA_DIR, id + '.json')

  if (req.method === 'GET') {
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' })
    const data = fs.readFileSync(file, 'utf8')
    res.json(JSON.parse(data))
    return
  }

  if (req.method === 'PUT') {
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2), 'utf8')
    res.json({ id, message: 'Updated' })
    return
  }

  if (req.method === 'DELETE') {
    if (fs.existsSync(file)) fs.unlinkSync(file)
    res.json({ message: 'Deleted' })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
