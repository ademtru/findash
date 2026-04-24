import { NextRequest, NextResponse } from 'next/server'
import { deleteTransaction, getTransactionById } from '@/db/queries/transactions'

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
