import { config as loadEnv } from 'dotenv'
import { neon } from '@neondatabase/serverless'

loadEnv({ path: '.env.local' })
loadEnv()

const sql = neon(process.env.DATABASE_URL!)

async function run() {
  const tables = (await sql.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)) as { tablename: string }[]
  console.log('tables:', tables.map((t) => t.tablename).join(', '))
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
