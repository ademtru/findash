import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createBatch, setBatchStatus, type FileRef } from '@/db/queries/batches'

export const runtime = 'nodejs'
export const maxDuration = 120

const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
])
const PDF_MIMES = new Set(['application/pdf'])
const CSV_MIMES = new Set(['text/csv', 'application/csv', 'text/plain'])

const MAX_FILES = 10
const MAX_IMAGE_BYTES = 12 * 1024 * 1024 // 12MB
const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20MB
const MAX_CSV_BYTES = 5 * 1024 * 1024 // 5MB

type Classification = 'image' | 'pdf' | 'csv'

function classify(file: File): Classification | null {
  const mime = (file.type || '').toLowerCase()
  const name = file.name.toLowerCase()
  if (IMAGE_MIMES.has(mime)) return 'image'
  if (PDF_MIMES.has(mime) || name.endsWith('.pdf')) return 'pdf'
  if (CSV_MIMES.has(mime) || name.endsWith('.csv')) return 'csv'
  return null
}

function sizeLimit(cls: Classification): number {
  if (cls === 'image') return MAX_IMAGE_BYTES
  if (cls === 'pdf') return MAX_PDF_BYTES
  return MAX_CSV_BYTES
}

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const files = formData.getAll('files').filter((v): v is File => v instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} files per batch` }, { status: 400 })
  }

  // Classify + validate all files
  const classified: { file: File; cls: Classification }[] = []
  for (const file of files) {
    const cls = classify(file)
    if (!cls) {
      return NextResponse.json(
        { error: `Unsupported file type for "${file.name}". Images, PDF, or CSV only.` },
        { status: 400 },
      )
    }
    if (file.size > sizeLimit(cls)) {
      const mb = Math.round(sizeLimit(cls) / 1024 / 1024)
      return NextResponse.json(
        { error: `"${file.name}" exceeds the ${mb}MB limit for ${cls}.` },
        { status: 400 },
      )
    }
    classified.push({ file, cls })
  }

  const yearRaw = formData.get('assumeYear') as string | null
  const assumeYear =
    yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : new Date().getFullYear()

  const batches: { batchId: string; name: string }[] = []

  for (const { file, cls } of classified) {
    const mime = file.type || (cls === 'pdf' ? 'application/pdf' : cls === 'csv' ? 'text/csv' : 'application/octet-stream')
    try {
      const bytes = Buffer.from(await file.arrayBuffer())
      const stamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const blob = await put(`captures/${stamp}-${safeName}`, bytes, {
        access: 'private',
        contentType: mime,
        token,
        addRandomSuffix: true,
      })
      const fileRef: FileRef = { blobUrl: blob.url, name: file.name, mimeType: mime, size: file.size }
      const batchKind = cls === 'image' ? 'screenshot' : cls
      const batch = await createBatch(batchKind as 'screenshot' | 'pdf' | 'csv', [fileRef])
      await setBatchStatus(batch.id, 'pending', { rawResponse: { assumeYear } })
      batches.push({ batchId: batch.id, name: file.name })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Failed to process "${file.name}": ${message}`, batches },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({ batches }, { status: 201 })
}
