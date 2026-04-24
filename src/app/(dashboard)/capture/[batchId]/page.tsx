import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getBatch, listPendingByBatch } from '@/db/queries/batches'
import { distinctCategories } from '@/db/queries/transactions'
import { mergeCategoriesForType } from '@/lib/categories'
import { ExtractedTransactionSchema } from '@/lib/ai/schemas'
import type { ExtractedTransaction } from '@/lib/ai/schemas'
import { ReviewGrid, type PendingItem } from './ReviewGrid'
import { BatchPoller } from './BatchPoller'
import { RetryButton } from './RetryButton'

export const dynamic = 'force-dynamic'

export default async function CaptureBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const batch = await getBatch(batchId)
  if (!batch) notFound()

  const [pending, userCategories] = await Promise.all([
    listPendingByBatch(batchId),
    distinctCategories(),
  ])

  const items: PendingItem[] = pending.map((p) => {
    const parsed = ExtractedTransactionSchema.safeParse(p.draft)
    const draft: ExtractedTransaction = parsed.success
      ? parsed.data
      : (p.draft as ExtractedTransaction)
    return {
      id: p.id,
      draft,
      duplicateOf: p.duplicateOf,
      isOwnTransfer: p.isOwnTransfer ?? false,
      userAction: p.userAction as PendingItem['userAction'],
      confidence:
        p.categoryConfidence === null ? null : Number(p.categoryConfidence),
    }
  })

  const allCategoryOptions = {
    expense: mergeCategoriesForType('expense', userCategories),
    income: mergeCategoriesForType('income', userCategories),
    transfer: mergeCategoriesForType('transfer', userCategories),
    investment: mergeCategoriesForType('investment', userCategories),
  }

  const fileUrls = Array.isArray(batch.fileRefs)
    ? (batch.fileRefs as { blobUrl: string; name: string; mimeType: string }[])
    : []

  const warnings =
    batch.rawResponse && typeof batch.rawResponse === 'object' && 'warnings' in batch.rawResponse
      ? ((batch.rawResponse as { warnings?: string[] }).warnings ?? [])
      : []

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/capture"
          className="flex items-center gap-1 text-[14px]"
          style={{ color: 'rgba(235,235,245,0.55)' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Scan
        </Link>
      </div>

      <div>
        <h1 className="text-[24px] font-bold text-white tracking-tight">Review extraction</h1>
        <p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
          {items.length} transactions extracted
          {items.filter((i) => i.duplicateOf).length > 0 &&
            ` — ${items.filter((i) => i.duplicateOf).length} already exist`}
          {items.filter((i) => i.isOwnTransfer && !i.duplicateOf).length > 0 &&
            ` — ${items.filter((i) => i.isOwnTransfer && !i.duplicateOf).length} own account transfers`}
        </p>
      </div>

      {(batch.status === 'pending' || batch.status === 'extracting') && (
        <BatchPoller batchId={batchId} initialStatus={batch.status} />
      )}

      {batch.status === 'failed' && (
        <div className="space-y-3">
          <div
            className="rounded-xl p-4 text-[14px]"
            style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
          >
            Extraction failed: {batch.error ?? 'unknown error'}
          </div>
          <RetryButton batchId={batchId} />
        </div>
      )}

      {warnings.length > 0 && (
        <div
          className="rounded-xl p-4 text-[13px] space-y-1"
          style={{ background: 'rgba(255,159,10,0.1)', color: '#ff9f0a' }}
        >
          {warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {fileUrls.length > 0 && (
        <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
          From {fileUrls.length} image{fileUrls.length === 1 ? '' : 's'}:{' '}
          {fileUrls.map((f) => f.name).join(', ')}
        </p>
      )}

      {(batch.status === 'review' || batch.status === 'committed') && (
        batch.status === 'committed' ? (
          <div
            className="rounded-xl p-5 text-center space-y-2"
            style={{ background: 'rgba(48,209,88,0.12)' }}
          >
            <p className="text-[16px] font-semibold" style={{ color: '#30d158' }}>
              Committed ✓
            </p>
            <Link
              href="/transactions"
              className="inline-block text-[14px] font-medium"
              style={{ color: '#0a84ff' }}
            >
              View transactions →
            </Link>
          </div>
        ) : (
          <ReviewGrid
            batchId={batchId}
            items={items}
            categoryOptionsByType={allCategoryOptions}
            readOnly={batch.status !== 'review'}
          />
        )
      )}
    </div>
  )
}
