import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteTransaction, getTransactionById, updateTransaction } from '@/db/queries/transactions'
import { TRANSACTION_TYPES } from '@/lib/ai/schemas'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ok = await deleteTransaction(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const transaction = await getTransactionById(id)
  if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ transaction })
}

const PatchBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().finite().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.string().min(1).max(60).optional(),
  description: z.string().min(1).max(160).optional(),
  account: z.string().max(120).optional(),
  ticker: z.string().nullable().optional(),
  shares: z.number().nullable().optional(),
  price_per_share: z.number().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: z.infer<typeof PatchBody>
  try {
    body = PatchBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }
  const transaction = await updateTransaction(id, body)
  if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ transaction })
}
