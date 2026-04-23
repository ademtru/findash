import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyMonth } from '@/db/queries/budgets'
import { prevMonth } from '@/lib/budgets'

const Body = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }
  const from = prevMonth(body.month)
  const copied = await copyMonth(from, body.month)
  return NextResponse.json({ from, to: body.month, copied })
}
