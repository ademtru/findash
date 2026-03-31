import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.BLOB_URL_INSIGHTS
    if (!url) {
      return NextResponse.json({ generated_at: null, monthly: [], anomalies: [], trends: [], investments: [] })
    }
    const response = await fetch(url, { next: { revalidate: 0 } })
    if (!response.ok) {
      return NextResponse.json({ generated_at: null, monthly: [], anomalies: [], trends: [], investments: [] })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ generated_at: null, monthly: [], anomalies: [], trends: [], investments: [] })
  }
}
