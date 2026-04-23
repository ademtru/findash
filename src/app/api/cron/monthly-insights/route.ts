import { NextRequest, NextResponse } from 'next/server'
import { generateInsightForPeriod } from '@/lib/ai/insights'
import { previousMonthKey } from '@/lib/periods'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl
  const periodKey = url.searchParams.get('period') ?? previousMonthKey()
  const force = url.searchParams.get('force') === 'true'

  try {
    const { skipped } = await generateInsightForPeriod({
      kind: 'monthly',
      periodKey,
      force,
    })
    return NextResponse.json({ periodKey, skipped })
  } catch (err) {
    console.error('monthly insight error', err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ periodKey, error: message }, { status: 502 })
  }
}
