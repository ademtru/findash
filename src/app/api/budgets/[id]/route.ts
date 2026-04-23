import { NextRequest, NextResponse } from 'next/server'
import { deleteBudget } from '@/db/queries/budgets'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ok = await deleteBudget(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
