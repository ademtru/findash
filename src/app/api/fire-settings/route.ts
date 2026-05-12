import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getFireSettings, upsertFireSettings } from '@/db/queries/fire-settings'

const PutBody = z.object({
  withdrawalRate: z.number().min(0.005).max(0.1),
  realReturnRate: z.number().min(-0.05).max(0.2),
  currentAge: z.number().int().min(0).max(120),
  targetRetirementAge: z.number().int().min(0).max(120),
  annualExpenseOverride: z.number().min(0).nullable(),
  monthlyContributionOverride: z.number().min(0).nullable(),
})

export async function GET() {
  const settings = await getFireSettings()
  return NextResponse.json({ settings })
}

export async function PUT(request: NextRequest) {
  let body: z.infer<typeof PutBody>
  try {
    body = PutBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }
  const settings = await upsertFireSettings(body)
  return NextResponse.json({ settings })
}
