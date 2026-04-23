import { config as loadEnv } from 'dotenv'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { neon } from '@neondatabase/serverless'

loadEnv({ path: '.env.local' })
loadEnv()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(url)
const migrationsDir = 'src/db/migrations'

async function ensureMigrationsTable() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function appliedHashes(): Promise<Set<string>> {
  const rows = (await sql.query(`SELECT hash FROM __drizzle_migrations`)) as { hash: string }[]
  return new Set(rows.map((r) => r.hash))
}

async function run() {
  await ensureMigrationsTable()
  const applied = await appliedHashes()

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const hash = file
    if (applied.has(hash)) {
      console.log(`  skip  ${file}`)
      continue
    }
    const body = readFileSync(join(migrationsDir, file), 'utf8')
    const statements = body
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const stmt of statements) {
      await sql.query(stmt)
    }
    await sql.query(`INSERT INTO __drizzle_migrations (hash) VALUES ($1)`, [hash])
    console.log(`  apply ${file}`)
  }
  console.log('done')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
