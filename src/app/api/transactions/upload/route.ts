import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import type { Transaction, TransactionData, InsightsData } from '@/types/transaction'

// ─── Type detection ───────────────────────────────────────────────

function detectType(parsed: unknown): 'transactions' | 'insights' | null {
  if (Array.isArray(parsed)) return 'transactions'
  const obj = parsed as Record<string, unknown>
  if (Array.isArray(obj.transactions)) return 'transactions'
  if (obj.generated_at !== undefined || Array.isArray(obj.monthly)) return 'insights'
  return null
}

// ─── Insights merge ───────────────────────────────────────────────

interface InsightsMergeResult {
  type: 'insights'
  monthsAdded: number
  monthsUpdated: number
  monthsPreserved: number
  anomaliesAdded: number
  investmentsUpdated: number
}

function mergeInsights(existing: InsightsData, incoming: InsightsData): { merged: InsightsData; result: InsightsMergeResult } {
  // monthly: incoming overwrites same month, new months get added, untouched months preserved
  const existingMonthMap = new Map(existing.monthly.map(m => [m.month, m]))
  const incomingMonthKeys = new Set(incoming.monthly.map(m => m.month))
  let monthsAdded = 0
  let monthsUpdated = 0
  for (const m of incoming.monthly) {
    if (existingMonthMap.has(m.month)) monthsUpdated++
    else monthsAdded++
    existingMonthMap.set(m.month, m)
  }
  const monthsPreserved = existing.monthly.filter(m => !incomingMonthKeys.has(m.month)).length
  const mergedMonthly = Array.from(existingMonthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))

  // anomalies: deduplicate by date+description composite key
  const existingAnomalyKeys = new Set(
    existing.anomalies.map(a => `${a.date}|${a.description}`)
  )
  const newAnomalies = incoming.anomalies.filter(
    a => !existingAnomalyKeys.has(`${a.date}|${a.description}`)
  )
  const mergedAnomalies = [...existing.anomalies, ...newAnomalies]
    .sort((a, b) => b.date.localeCompare(a.date))

  // trends: replace entirely (no stable dedup key)
  const mergedTrends = incoming.trends.length > 0 ? incoming.trends : existing.trends

  // investments: merge by ticker — incoming overwrites same ticker
  const tickerMap = new Map(existing.investments.map(i => [i.ticker, i]))
  let investmentsUpdated = 0
  for (const inv of incoming.investments) {
    if (tickerMap.has(inv.ticker)) investmentsUpdated++
    tickerMap.set(inv.ticker, inv)
  }

  return {
    merged: {
      generated_at: incoming.generated_at || existing.generated_at,
      monthly: mergedMonthly,
      anomalies: mergedAnomalies,
      trends: mergedTrends,
      investments: Array.from(tickerMap.values()),
    },
    result: {
      type: 'insights',
      monthsAdded,
      monthsUpdated,
      monthsPreserved,
      anomaliesAdded: newAnomalies.length,
      investmentsUpdated,
    },
  }
}

// ─── Route handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  let parsed: unknown
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    parsed = JSON.parse(await file.text())
  } catch {
    return NextResponse.json({ error: 'Could not parse JSON file' }, { status: 400 })
  }

  const fileType = detectType(parsed)
  if (!fileType) {
    return NextResponse.json(
      { error: 'Unrecognized format — expected a transactions or insights JSON file' },
      { status: 400 }
    )
  }

  // ── Transactions ──────────────────────────────────────────────
  if (fileType === 'transactions') {
    const incoming: Transaction[] = Array.isArray(parsed)
      ? (parsed as Transaction[])
      : ((parsed as TransactionData).transactions ?? [])

    let existing: Transaction[] = []
    const blobUrl = process.env.BLOB_URL_TRANSACTIONS
    if (blobUrl) {
      try {
        const res = await fetch(blobUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (res.ok) {
          const raw: unknown = await res.json()
          existing = Array.isArray(raw) ? (raw as Transaction[]) : ((raw as TransactionData).transactions ?? [])
        }
      } catch { /* start fresh */ }
    }

    const existingIds = new Set(existing.map(t => t.id))
    const toAdd = incoming.filter(t => !existingIds.has(t.id))
    const merged = [...existing, ...toAdd]

    await put('transactions.json', JSON.stringify({ transactions: merged }, null, 2), {
      access: 'private', contentType: 'application/json', token,
      addRandomSuffix: false, allowOverwrite: true,
    })

    return NextResponse.json({
      type: 'transactions',
      added: toAdd.length,
      duplicates: incoming.length - toAdd.length,
      total: merged.length,
    })
  }

  // ── Insights ──────────────────────────────────────────────────
  const incoming = parsed as InsightsData

  let existing: InsightsData = { generated_at: '', monthly: [], anomalies: [], trends: [], investments: [] }
  const blobUrl = process.env.BLOB_URL_INSIGHTS
  if (blobUrl) {
    try {
      const res = await fetch(blobUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (res.ok) existing = await res.json() as InsightsData
    } catch { /* start fresh */ }
  }

  const { merged, result } = mergeInsights(existing, incoming)

  await put('insights.json', JSON.stringify(merged, null, 2), {
    access: 'private', contentType: 'application/json', token,
    addRandomSuffix: false, allowOverwrite: true,
  })

  return NextResponse.json(result)
}
