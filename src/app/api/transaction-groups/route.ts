import { NextResponse } from 'next/server'
import { z } from 'zod'
import { combineTransactions } from '@/db/queries/transactions'

const schema = z.object({
  transactionIds: z.array(z.string()).min(2),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Need at least 2 transaction IDs' }, { status: 400 })
  }
  const groupId = await combineTransactions(parsed.data.transactionIds)
  return NextResponse.json({ groupId }, { status: 201 })
}
