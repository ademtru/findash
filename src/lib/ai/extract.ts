import { generateObject } from 'ai'
import { MODELS } from './gateway'
import { ExtractionBatchSchema, type ExtractionBatch } from './schemas'
import { buildExtractPrompt } from './prompts'
import { listTransactions, distinctCategories } from '@/db/queries/transactions'
import {
  createBatch,
  insertPendingRows,
  setBatchStatus,
  type FileRef,
} from '@/db/queries/batches'
import { findFuzzyDuplicate } from '@/lib/transactions/dedup'
import type { Transaction } from '@/types/transaction'

export type ExtractKind = 'screenshot' | 'pdf' | 'csv'

export interface ImagePart {
  kind: 'image'
  bytes: Buffer
  mimeType: string
}
export interface PdfPart {
  kind: 'pdf'
  bytes: Buffer
}
export interface CsvPart {
  kind: 'csv'
  text: string
  filename: string
}

export type ExtractPart = ImagePart | PdfPart | CsvPart

export interface RunExtractArgs {
  kind: ExtractKind
  files: FileRef[]
  parts: ExtractPart[]
  assumeYear: number
}

export interface RunExtractResult {
  batchId: string
  transactions: ExtractionBatch['transactions']
  warnings: string[]
}

function buildReferenceSet(txns: Transaction[], around: string): Transaction[] {
  const windowDays = 45
  const ref = new Date(around)
  const min = new Date(ref)
  min.setDate(min.getDate() - windowDays)
  const max = new Date(ref)
  max.setDate(max.getDate() + windowDays)
  return txns.filter((t) => {
    const d = new Date(t.date)
    return d >= min && d <= max
  })
}

function buildUserContent(
  textPrompt: string,
  parts: ExtractPart[],
): { type: 'text'; text: string }[] | Array<{ type: string; [k: string]: unknown }> {
  const content: Array<{ type: string; [k: string]: unknown }> = [
    { type: 'text', text: textPrompt },
  ]
  for (const p of parts) {
    if (p.kind === 'image') {
      content.push({ type: 'image', image: p.bytes, mimeType: p.mimeType })
    } else if (p.kind === 'pdf') {
      content.push({ type: 'file', data: p.bytes, mediaType: 'application/pdf' })
    } else if (p.kind === 'csv') {
      content.push({
        type: 'text',
        text: `<csv filename="${p.filename}">\n${p.text}\n</csv>`,
      })
    }
  }
  return content
}

export async function runExtract(args: RunExtractArgs): Promise<RunExtractResult> {
  const batch = await createBatch(args.kind, args.files)
  try {
    const activeCategories = await distinctCategories()

    const { system, user } = buildExtractPrompt({
      assumeYear: args.assumeYear,
      activeCategories,
      sourceKind: args.kind,
    })

    const model = args.kind === 'csv' ? MODELS.extractCsv : MODELS.extractImage
    const content = buildUserContent(user, args.parts)

    const result = await generateObject({
      model,
      schema: ExtractionBatchSchema,
      system,
      messages: [
        {
          role: 'user',
          // AI SDK type for message content is a union; we build a compatible shape.
          content: content as never,
        },
      ],
      temperature: 0,
    })

    const extracted = result.object

    const existing = await listTransactions()
    const pendingRows = extracted.transactions.map((t) => {
      const reference = buildReferenceSet(existing, t.date)
      const dupe = findFuzzyDuplicate(
        { date: t.date, amount: t.amount, description: t.description },
        reference,
      )
      return {
        batchId: batch.id,
        draft: t,
        suggestedCategory: t.category,
        categoryConfidence: t.confidence ?? null,
        duplicateOf: dupe?.id ?? null,
      }
    })

    await insertPendingRows(pendingRows)
    await setBatchStatus(batch.id, 'review', { model, rawResponse: extracted })

    return {
      batchId: batch.id,
      transactions: extracted.transactions,
      warnings: extracted.warnings ?? [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await setBatchStatus(batch.id, 'failed', { error: message })
    throw err
  }
}
