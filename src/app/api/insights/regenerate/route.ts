import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateInsightForPeriod } from '@/lib/ai/insights'
import { previousIsoWeekKey, previousMonthKey } from '@/lib/periods'

export const runtime = 'nodejs'
export const maxDuration = 300

const Body = z.object({
  kind: z.enum(['weekly', 'monthly']),
  periodKey: z.string().optional(),
  force: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const periodKey =
    body.periodKey ??
    (body.kind === 'weekly' ? previousIsoWeekKey() : previousMonthKey())

  try {
    const { skipped } = await generateInsightForPeriod({
      kind: body.kind,
      periodKey,
      force: body.force,
    })
    return NextResponse.json({ periodKey, skipped })
  } catch (err) {
    console.error('regenerate error', err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ periodKey, error: message }, { status: 502 })
  }
}
