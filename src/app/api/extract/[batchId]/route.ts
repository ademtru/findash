import { NextRequest, NextResponse } from 'next/server'
import { getBatch, listPendingByBatch } from '@/db/queries/batches'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params
  const batch = await getBatch(batchId)
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  const pending = await listPendingByBatch(batchId)
  return NextResponse.json({ batch, pending })
}
