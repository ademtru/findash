import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { suggestCategory } from '@/lib/ai/categorize'

const Body = z.object({
  description: z.string().min(1).max(160),
  amount: z.number().finite(),
  account: z.string().min(1).max(80),
})

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof Body>
  try {
    parsed = Body.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  try {
    const suggestion = await suggestCategory(parsed)
    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('categorize error', err)
    return NextResponse.json({ error: 'Categorisation failed' }, { status: 502 })
  }
}
