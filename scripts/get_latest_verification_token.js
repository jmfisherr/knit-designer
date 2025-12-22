const { PrismaClient } = require('@prisma/client')
async function main() {
  const prisma = new PrismaClient()
  const rows = await prisma.verificationToken.findMany({ orderBy: { expires: 'desc' }, take: 10 })
  console.log('Latest verification tokens:')
  rows.forEach(r => console.log(r))
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
