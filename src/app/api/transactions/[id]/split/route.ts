import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransactionById, deleteTransaction, insertTransaction } from '@/db/queries/transactions'
import { generateTransactionId } from '@/lib/transactions/id'
import { validateSplits } from '@/lib/transactions/split'

const SplitBody = z.object({
  splits: z.array(z.object({
    amount: z.number().finite(),
    description: z.string().min(1).max(160),
    category: z.string().min(1).max(60),
  })).min(2),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const original = await getTransactionById(id)
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (original.type === 'investment') {
    return NextResponse.json({ error: 'Investment transactions cannot be split' }, { status: 422 })
  }

  let body: z.infer<typeof SplitBody>
  try {
    body = SplitBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const validationError = validateSplits(original.amount, body.splits)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 })
  }

  await deleteTransaction(id)

  const inserted = await Promise.all(
    body.splits.map((split) => {
      const splitId = generateTransactionId({
        date: original.date,
        amount: split.amount,
        description: split.description,
      })
      return insertTransaction({
        id: splitId,
        date: original.date,
        amount: String(split.amount),
        type: original.type,
        category: split.category,
        description: split.description,
        account: original.account,
        source: 'manual',
      })
    }),
  )

  return NextResponse.json({ transactions: inserted }, { status: 201 })
}
