import { db } from '@/db/client'
import {
  extractionBatches,
  pendingTransactions,
  type ExtractionBatchRow,
  type PendingTransactionRow,
} from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

export interface FileRef {
  blobUrl: string
  name: string
  mimeType: string
  size: number
}

export async function createBatch(
  kind: 'screenshot' | 'pdf' | 'csv',
  fileRefs: FileRef[],
): Promise<ExtractionBatchRow> {
  const [row] = await db
    .insert(extractionBatches)
    .values({ kind, fileRefs, status: 'extracting' })
    .returning()
  return row
}

export async function setBatchStatus(
  batchId: string,
  status: 'pending' | 'extracting' | 'review' | 'committed' | 'discarded' | 'failed',
  updates: { model?: string; rawResponse?: unknown; error?: string } = {},
): Promise<void> {
  await db
    .update(extractionBatches)
    .set({
      status,
      ...(updates.model !== undefined && { model: updates.model }),
      ...(updates.rawResponse !== undefined && { rawResponse: updates.rawResponse as object }),
      ...(updates.error !== undefined && { error: updates.error }),
      ...(status === 'committed' && { committedAt: new Date() }),
    })
    .where(eq(extractionBatches.id, batchId))
}

export async function getBatch(batchId: string): Promise<ExtractionBatchRow | null> {
  const rows = await db
    .select()
    .from(extractionBatches)
    .where(eq(extractionBatches.id, batchId))
    .limit(1)
  return rows[0] ?? null
}

export async function listRecentBatches(limit = 20): Promise<ExtractionBatchRow[]> {
  return db
    .select()
    .from(extractionBatches)
    .orderBy(desc(extractionBatches.createdAt))
    .limit(limit)
}

export async function insertPendingRows(
  rows: {
    batchId: string
    draft: unknown
    suggestedCategory: string | null
    categoryConfidence: number | null
    duplicateOf: string | null
  }[],
): Promise<PendingTransactionRow[]> {
  if (rows.length === 0) return []
  return db
    .insert(pendingTransactions)
    .values(
      rows.map((r) => ({
        batchId: r.batchId,
        draft: r.draft as object,
        suggestedCategory: r.suggestedCategory,
        categoryConfidence:
          r.categoryConfidence === null ? null : String(r.categoryConfidence),
        duplicateOf: r.duplicateOf,
      })),
    )
    .returning()
}

export async function listPendingByBatch(batchId: string): Promise<PendingTransactionRow[]> {
  return db
    .select()
    .from(pendingTransactions)
    .where(eq(pendingTransactions.batchId, batchId))
    .orderBy(pendingTransactions.createdAt)
}

export async function markPendingAction(
  pendingId: string,
  userAction: 'accept' | 'edit' | 'skip',
): Promise<void> {
  await db
    .update(pendingTransactions)
    .set({ userAction })
    .where(eq(pendingTransactions.id, pendingId))
}

export async function clearPendingByBatch(batchId: string): Promise<void> {
  await db
    .delete(pendingTransactions)
    .where(eq(pendingTransactions.batchId, batchId))
}
