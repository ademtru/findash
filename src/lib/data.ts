import type { TransactionData, InsightsData } from '@/types/transaction'

export async function getTransactions(): Promise<TransactionData> {
  try {
    const url = process.env.BLOB_URL_TRANSACTIONS
    if (!url) return { transactions: [] }
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { transactions: [] }
    return res.json()
  } catch {
    return { transactions: [] }
  }
}

export async function getInsights(): Promise<InsightsData> {
  try {
    const url = process.env.BLOB_URL_INSIGHTS
    if (!url) return { generated_at: '', monthly: [], anomalies: [], trends: [], investments: [] }
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { generated_at: '', monthly: [], anomalies: [], trends: [], investments: [] }
    return res.json()
  } catch {
    return { generated_at: '', monthly: [], anomalies: [], trends: [], investments: [] }
  }
}
