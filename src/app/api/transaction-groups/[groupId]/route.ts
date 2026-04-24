import { NextResponse } from 'next/server'
import { uncombineGroup } from '@/db/queries/transactions'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params
  await uncombineGroup(groupId)
  return NextResponse.json({ ok: true })
}
