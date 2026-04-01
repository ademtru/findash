#!/usr/bin/env node
// Load .env.local manually (tsx doesn't load it automatically)
import { readFileSync as _readEnv } from 'fs'
import { resolve as _resolve } from 'path'
try {
  _readEnv(_resolve(process.cwd(), '.env.local'), 'utf-8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
    })
} catch { /* no .env.local */ }

/**
 * Fetches transactions.json and insights.json from Vercel Blob and
 * reports on their structure and any obvious issues.
 *
 * Usage: pnpm tsx scripts/check-data.ts
 */

async function checkBlob(name: string, url: string | undefined, token: string) {
  console.log(`\n── ${name} ──────────────────────────`)

  if (!url) {
    console.log(`  ✗  URL not set (BLOB_URL_${name === 'transactions' ? 'TRANSACTIONS' : 'INSIGHTS'} missing from env)`)
    return
  }

  console.log(`  URL: ${url}`)

  let res: Response
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  } catch (err) {
    console.log(`  ✗  Fetch failed: ${err}`)
    return
  }

  console.log(`  HTTP status: ${res.status} ${res.statusText}`)
  if (!res.ok) {
    const body = await res.text()
    console.log(`  ✗  Response body: ${body.slice(0, 300)}`)
    return
  }

  let data: unknown
  try {
    data = await res.json()
  } catch (err) {
    console.log(`  ✗  Invalid JSON: ${err}`)
    return
  }

  if (name === 'transactions') {
    const d = data as Record<string, unknown>
    if (!d || typeof d !== 'object') {
      console.log(`  ✗  Root is not an object, got: ${typeof d}`)
      return
    }
    if (!('transactions' in d)) {
      console.log(`  ✗  Missing "transactions" key. Top-level keys: ${Object.keys(d).join(', ')}`)
      return
    }
    const txns = d.transactions
    if (!Array.isArray(txns)) {
      console.log(`  ✗  "transactions" is not an array, got: ${typeof txns}`)
      return
    }
    console.log(`  ✓  transactions array: ${txns.length} entries`)
    if (txns.length > 0) {
      const first = txns[0] as Record<string, unknown>
      console.log(`  First entry keys: ${Object.keys(first).join(', ')}`)
      console.log(`  First entry: ${JSON.stringify(first).slice(0, 200)}`)
      // Check required fields on a sample
      const required = ['id', 'date', 'amount', 'type', 'category', 'description', 'account']
      const missing = required.filter(k => !(k in first))
      if (missing.length) console.log(`  ✗  First entry missing required fields: ${missing.join(', ')}`)
      else console.log(`  ✓  Required fields present`)
      // Check for null shares / price_per_share
      const nullShares = txns.filter((t: unknown) => (t as Record<string, unknown>).shares === null).length
      const nullPrice = txns.filter((t: unknown) => (t as Record<string, unknown>).price_per_share === null).length
      if (nullShares > 0) console.log(`  ℹ  ${nullShares} entries have shares: null (OK, handled)`)
      if (nullPrice > 0) console.log(`  ℹ  ${nullPrice} entries have price_per_share: null (OK, handled)`)
    }
  } else {
    const d = data as Record<string, unknown>
    if (!d || typeof d !== 'object') {
      console.log(`  ✗  Root is not an object, got: ${typeof d}`)
      return
    }
    const expected = ['generated_at', 'monthly', 'anomalies', 'trends', 'investments']
    const present = expected.filter(k => k in d)
    const missing = expected.filter(k => !(k in d))
    console.log(`  ✓  Present keys: ${present.join(', ')}`)
    if (missing.length) console.log(`  ✗  Missing keys: ${missing.join(', ')}`)
    console.log(`  monthly: ${Array.isArray(d.monthly) ? (d.monthly as unknown[]).length + ' entries' : typeof d.monthly}`)
    console.log(`  anomalies: ${Array.isArray(d.anomalies) ? (d.anomalies as unknown[]).length + ' entries' : typeof d.anomalies}`)
    console.log(`  trends: ${Array.isArray(d.trends) ? (d.trends as unknown[]).length + ' entries' : typeof d.trends}`)
    console.log(`  generated_at: ${d.generated_at}`)
  }
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('Error: BLOB_READ_WRITE_TOKEN not set in .env.local')
    process.exit(1)
  }

  await checkBlob('transactions', process.env.BLOB_URL_TRANSACTIONS, token)
  await checkBlob('insights', process.env.BLOB_URL_INSIGHTS, token)

  console.log('\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
