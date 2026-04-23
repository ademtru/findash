import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listTransactions, insertTransaction } from '@/db/queries/transactions'
import { generateTransactionId } from '@/lib/transactions/id'
import { findFuzzyDuplicate } from '@/lib/transactions/dedup'
import { TRANSACTION_TYPES } from '@/lib/ai/schemas'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const transactions = await listTransactions({
    month: params.get('month') ?? undefined,
    category: params.get('category') ?? undefined,
    type: params.get('type') ?? undefined,
  })
  return NextResponse.json({ transactions })
}

const CreateBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().finite(),
  type: z.enum(TRANSACTION_TYPES),
  category: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
  account: z.string().max(120).optional(),
  ticker: z.string().nullable().optional(),
  shares: z.number().nullable().optional(),
  price_per_share: z.number().nullable().optional(),
  source: z.enum(['manual', 'screenshot', 'pdf', 'csv', 'migrated']).default('manual'),
  forceCreate: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof CreateBody>
  try {
    body = CreateBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  if (!body.forceCreate) {
    const sameDay = await listTransactions({ month: body.date.slice(0, 7) })
    const dupe = findFuzzyDuplicate(body, sameDay)
    if (dupe) {
      return NextResponse.json(
        { duplicateOf: dupe.id, transaction: dupe, created: false },
        { status: 409 },
      )
    }
  }

  const id = generateTransactionId({
    date: body.date,
    amount: body.amount,
    description: body.description,
  })

  const transaction = await insertTransaction({
    id,
    date: body.date,
    amount: String(body.amount),
    type: body.type,
    category: body.category,
    description: body.description,
    account: body.account ?? 'Main',
    ticker: body.ticker ?? null,
    shares: body.shares === null || body.shares === undefined ? null : String(body.shares),
    pricePerShare:
      body.price_per_share === null || body.price_per_share === undefined
        ? null
        : String(body.price_per_share),
    source: body.source,
  })

  return NextResponse.json({ transaction, created: true }, { status: 201 })
}

