import { NextRequest, NextResponse } from 'next/server'
import { getInsightByPeriod, listInsights, type Period } from '@/db/queries/insights'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const typeRaw = searchParams.get('type')
  const period = searchParams.get('period')
  const type: Period = typeRaw === 'monthly' ? 'monthly' : 'weekly'

  if (period) {
    const row = await getInsightByPeriod(type, period)
    return NextResponse.json({ insight: row })
  }
  const rows = await listInsights(type, 24)
  return NextResponse.json({ insights: rows })
}
