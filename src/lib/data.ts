import { unstable_noStore as noStore } from 'next/cache'
import type { TransactionData, InsightsData } from '@/types/transaction'

async function fetchPrivateBlob<T>(url: string, fallback: T): Promise<T> {
  noStore()
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return fallback
    return res.json()
  } catch {
    return fallback
  }
}

export async function getTransactions(): Promise<TransactionData> {
  const url = process.env.BLOB_URL_TRANSACTIONS
  if (!url) return { transactions: [] }
  return fetchPrivateBlob(url, { transactions: [] })
}

export async function getInsights(): Promise<InsightsData> {
  const url = process.env.BLOB_URL_INSIGHTS
  if (!url) return { generated_at: '', monthly: [], anomalies: [], trends: [], investments: [] }
  return fetchPrivateBlob(url, { generated_at: '', monthly: [], anomalies: [], trends: [], investments: [] })
}
