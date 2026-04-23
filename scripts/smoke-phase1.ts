import { config as loadEnv } from 'dotenv'
import { neon } from '@neondatabase/serverless'

loadEnv({ path: '.env.local' })
loadEnv()

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log('\n=== row counts ===')
  for (const t of [
    'transactions',
    'budgets',
    'insights',
    'extraction_batches',
    'pending_transactions',
    'categorization_feedback',
    'app_settings',
  ]) {
    const rows = (await sql.query(`SELECT count(*)::int AS c FROM ${t}`)) as { c: number }[]
    console.log(`  ${t.padEnd(30)} ${rows[0].c}`)
  }

  console.log('\n=== sample insert round-trip ===')
  await sql.query(`
    INSERT INTO transactions (id, date, amount, type, category, description, account, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING
  `, [
    '2026-04-23-500-smoke-test-0000',
    '2026-04-23',
    -5.00,
    'expense',
    'Test',
    'Smoke Test Coffee',
    'Smoke Account',
    'manual',
  ])
  const found = (await sql.query(
    `SELECT id, amount, category FROM transactions WHERE id = $1`,
    ['2026-04-23-500-smoke-test-0000'],
  )) as { id: string; amount: string; category: string }[]
  console.log('  inserted:', found[0])
  await sql.query(`DELETE FROM transactions WHERE id = $1`, ['2026-04-23-500-smoke-test-0000'])
  console.log('  cleanup: ok')

  console.log('\nAll good.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
