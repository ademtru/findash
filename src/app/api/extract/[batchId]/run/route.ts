import { NextRequest, NextResponse } from 'next/server'
import { getBatch, setBatchStatus, clearPendingByBatch } from '@/db/queries/batches'
import { runExtract } from '@/lib/ai/extract'
import type { ExtractPart } from '@/lib/ai/extract'
import type { FileRef } from '@/db/queries/batches'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params
  const batch = await getBatch(batchId)
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

  // Idempotency: skip if already running or done
  if (batch.status === 'extracting' || batch.status === 'review' || batch.status === 'committed') {
    return NextResponse.json({ status: batch.status })
  }

  // Reset for pending or failed (retry case)
  await clearPendingByBatch(batchId)
  await setBatchStatus(batchId, 'extracting')

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    await setBatchStatus(batchId, 'failed', { error: 'Storage not configured' })
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  // Recover assumeYear from rawResponse (stored during upload)
  const assumeYear =
    batch.rawResponse &&
    typeof batch.rawResponse === 'object' &&
    'assumeYear' in batch.rawResponse &&
    typeof (batch.rawResponse as { assumeYear?: unknown }).assumeYear === 'number'
      ? (batch.rawResponse as { assumeYear: number }).assumeYear
      : new Date().getFullYear()

  const fileRefs = batch.fileRefs as FileRef[]
  const parts: ExtractPart[] = []

  // Download each blob and build extract parts
  for (const ref of fileRefs) {
    const res = await fetch(ref.blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      await setBatchStatus(batchId, 'failed', { error: `Failed to download ${ref.name}` })
      return NextResponse.json({ error: `Failed to download ${ref.name}` }, { status: 502 })
    }
    const bytes = Buffer.from(await res.arrayBuffer())
    const mime = ref.mimeType.toLowerCase()

    if (mime.startsWith('image/')) {
      parts.push({ kind: 'image', bytes, mimeType: ref.mimeType })
    } else if (mime === 'application/pdf') {
      parts.push({ kind: 'pdf', bytes })
    } else {
      parts.push({ kind: 'csv', text: bytes.toString('utf-8'), filename: ref.name })
    }
  }

  try {
    await runExtract({
      batchId,
      kind: batch.kind as 'screenshot' | 'pdf' | 'csv',
      files: fileRefs,
      parts,
      assumeYear,
    })
    return NextResponse.json({ status: 'review' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // setBatchStatus to failed is already handled inside runExtract on error
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
