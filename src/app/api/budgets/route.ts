import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  listAllBudgets,
  listBudgetsForMonth,
  upsertBudget,
} from '@/db/queries/budgets'

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month')
  const rows =
    month && /^\d{4}-\d{2}$/.test(month)
      ? await listBudgetsForMonth(month)
      : await listAllBudgets()
  return NextResponse.json({ budgets: rows })
}

const UpsertBody = z.object({
  month: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.null()]),
  category: z.string().min(1).max(80),
  capCents: z.number().int().min(0).max(10_000_000),
  note: z.string().max(200).nullable().optional(),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof UpsertBody>
  try {
    body = UpsertBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const budget = await upsertBudget(body)
  return NextResponse.json({ budget })
}
