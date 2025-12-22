const fs = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  const content = fs.readFileSync(file, 'utf8')
  content.split(/\n/).forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const idx = line.indexOf('=')
    if (idx === -1) return
    const key = line.slice(0, idx)
    const val = line.slice(idx + 1)
    process.env[key] = val
  })
}

loadEnv(path.resolve(process.cwd(), '.env.local'))

console.log('Running: npx prisma db push')
const res = spawnSync('npx', ['prisma', 'db', 'push'], { stdio: 'inherit', shell: false })
if (res.error) {
  console.error('Failed to run prisma db push:', res.error)
  process.exit(1)
}
process.exit(res.status)
