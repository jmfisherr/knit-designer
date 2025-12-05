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
    // If the name changed, rename the file to keep filenames in sync with titles.
    // Filename format is '<uniq>-<slug>.json' where uniq is the prefix (created at POST).
    try {
      const bodyName = req.body && req.body.name ? String(req.body.name) : null
      const parts = id.split('-')
      const uniq = parts[0]
      const safe = bodyName ? bodyName.toLowerCase().replace(/[^a-z0-9-_ ]+/g, '').trim().replace(/\s+/g, '_').slice(0,80) : null
      const newStem = safe ? `${uniq}-${safe || 'untitled'}` : id
      const newFile = path.join(DATA_DIR, newStem + '.json')

      fs.writeFileSync(newFile, JSON.stringify(req.body, null, 2), 'utf8')
      if (newFile !== file && fs.existsSync(file)) {
        try { fs.unlinkSync(file) } catch (e) { /* ignore */ }
      }
      res.json({ id: newStem, message: 'Updated' })
    } catch (err) {
      res.status(500).json({ error: 'Failed to update' })
    }
    return
  }

  if (req.method === 'DELETE') {
    if (fs.existsSync(file)) fs.unlinkSync(file)
    res.json({ message: 'Deleted' })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
