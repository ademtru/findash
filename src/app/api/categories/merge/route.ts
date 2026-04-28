import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mergeCategories } from '@/db/queries/categories'

const MergeBody = z.object({
  from: z.string().min(1).array().min(1),
  to: z.string().min(1).max(80),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof MergeBody>
  try {
    body = MergeBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const fromFiltered = body.from.filter((c) => c !== body.to)
  if (fromFiltered.length === 0) {
    return NextResponse.json({ error: 'No categories to merge' }, { status: 400 })
  }

  const updatedTransactions = await mergeCategories(fromFiltered, body.to)
  return NextResponse.json({ ok: true, updatedTransactions })
}
