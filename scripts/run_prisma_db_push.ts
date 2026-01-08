import { execSync } from 'child_process'
import fs from 'fs'

// Load .env.local into process.env
try {
  const env = fs.readFileSync('.env.local', 'utf8').split(/\n/).filter(Boolean)
  env.forEach(l => { const i = l.indexOf('='); if (i > 0) process.env[l.slice(0,i)] = l.slice(i+1) })
} catch (e) { /* ignore */ }

try {
  console.log('Running: npx prisma db push')
  execSync('npx prisma db push', { stdio: 'inherit' })
} catch (err) {
  console.error('prisma db push failed', err)
  process.exit(1)
}
