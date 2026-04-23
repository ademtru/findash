import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { categorizationFeedback, pendingTransactions, transactions } from '@/db/schema'
import { getBatch, listPendingByBatch, setBatchStatus } from '@/db/queries/batches'
import { ExtractedTransactionSchema } from '@/lib/ai/schemas'
import { generateTransactionId, merchantSlug } from '@/lib/transactions/id'
import { eq } from 'drizzle-orm'

const CommitBody = z.object({
  decisions: z
    .array(
      z.object({
        pendingId: z.string().uuid(),
        action: z.enum(['accept', 'skip']),
        edited: ExtractedTransactionSchema.partial().optional(),
      }),
    )
    .min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params
  const batch = await getBatch(batchId)
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

  let body: z.infer<typeof CommitBody>
  try {
    body = CommitBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const pending = await listPendingByBatch(batchId)
  const byId = new Map(pending.map((p) => [p.id, p]))

  let committed = 0
  let skipped = 0
  let duplicates = 0

  for (const d of body.decisions) {
    const row = byId.get(d.pendingId)
    if (!row) continue

    if (d.action === 'skip') {
      await db
        .update(pendingTransactions)
        .set({ userAction: 'skip' })
        .where(eq(pendingTransactions.id, row.id))
      skipped++
      continue
    }

    const draft = ExtractedTransactionSchema.safeParse(row.draft)
    if (!draft.success) continue
    const base = draft.data
    const edited = { ...base, ...d.edited }

    if (row.duplicateOf) {
      duplicates++
      await db
        .update(pendingTransactions)
        .set({ userAction: 'skip' })
        .where(eq(pendingTransactions.id, row.id))
      continue
    }

    const id = generateTransactionId({
      date: edited.date,
      amount: edited.amount,
      description: edited.description,
    })

    try {
      await db.insert(transactions).values({
        id,
        date: edited.date,
        amount: String(edited.amount),
        type: edited.type,
        category: edited.category,
        description: edited.description,
        account: edited.account,
        ticker: edited.ticker ?? null,
        shares: edited.shares === null || edited.shares === undefined ? null : String(edited.shares),
        pricePerShare:
          edited.price_per_share === null || edited.price_per_share === undefined
            ? null
            : String(edited.price_per_share),
        source: 'screenshot',
        sourceBatchId: batchId,
      })
      committed++
    } catch (err) {
      console.error('commit insert error for pending', row.id, err)
      continue
    }

    await db
      .update(pendingTransactions)
      .set({ userAction: d.edited ? 'edit' : 'accept' })
      .where(eq(pendingTransactions.id, row.id))

    if (row.suggestedCategory) {
      await db.insert(categorizationFeedback).values({
        description: edited.description,
        merchantSlug: merchantSlug(edited.description),
        suggestedCategory: row.suggestedCategory,
        chosenCategory: edited.category,
        accepted: row.suggestedCategory === edited.category,
      })
    }
  }

  await setBatchStatus(batchId, 'committed')

  return NextResponse.json({ committed, skipped, duplicates })
}
