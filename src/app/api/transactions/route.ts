import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.BLOB_URL_TRANSACTIONS
    if (!url) {
      return NextResponse.json({ transactions: [] })
    }
    const response = await fetch(url, { next: { revalidate: 0 } })
    if (!response.ok) {
      return NextResponse.json({ transactions: [] })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ transactions: [] })
  }
}
