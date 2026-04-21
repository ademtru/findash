import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import type { Transaction, TransactionData } from '@/types/transaction'

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  let incoming: Transaction[]
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const text = await file.text()
    const parsed: unknown = JSON.parse(text)
    if (Array.isArray(parsed)) {
      incoming = parsed as Transaction[]
    } else {
      const obj = parsed as TransactionData
      if (!Array.isArray(obj.transactions)) {
        return NextResponse.json(
          { error: 'Invalid format — expected { transactions: [...] } or a bare array' },
          { status: 400 }
        )
      }
      incoming = obj.transactions
    }
  } catch {
    return NextResponse.json({ error: 'Could not parse JSON file' }, { status: 400 })
  }

  // Fetch existing transactions
  let existing: Transaction[] = []
  const blobUrl = process.env.BLOB_URL_TRANSACTIONS
  if (blobUrl) {
    try {
      const res = await fetch(blobUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const raw: unknown = await res.json()
        existing = Array.isArray(raw)
          ? (raw as Transaction[])
          : ((raw as TransactionData).transactions ?? [])
      }
    } catch { /* start fresh */ }
  }

  // Deduplicate by id — skip any incoming transaction whose id already exists
  const existingIds = new Set(existing.map(t => t.id))
  const toAdd = incoming.filter(t => !existingIds.has(t.id))
  const duplicates = incoming.length - toAdd.length
  const merged = [...existing, ...toAdd]

  await put('transactions.json', JSON.stringify({ transactions: merged }, null, 2), {
    access: 'private',
    contentType: 'application/json',
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  return NextResponse.json({ added: toAdd.length, duplicates, total: merged.length })
}
