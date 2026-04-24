import { NextRequest, NextResponse } from 'next/server'
import { deleteAccount } from '@/db/queries/accounts'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await deleteAccount(id)
  return NextResponse.json({ ok: true })
}
