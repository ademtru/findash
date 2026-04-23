'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import type { ExtractedTransaction } from '@/lib/ai/schemas'
import type { TransactionType } from '@/types/transaction'
import { fetchJson } from '@/lib/fetch-json'

export interface PendingItem {
  id: string
  draft: ExtractedTransaction
  duplicateOf: string | null
  userAction: 'accept' | 'edit' | 'skip' | null
  confidence: number | null
}

type Decision = 'accept' | 'skip'

export function ReviewGrid({
  batchId,
  items,
  categoryOptionsByType,
  readOnly,
}: {
  batchId: string
  items: PendingItem[]
  categoryOptionsByType: Record<TransactionType, string[]>
  readOnly: boolean
}) {
  const router = useRouter()
  const [edits, setEdits] = useState<Record<string, Partial<ExtractedTransaction>>>({})
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const out: Record<string, Decision> = {}
    for (const it of items) out[it.id] = it.duplicateOf ? 'skip' : 'accept'
    return out
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toCommit = useMemo(
    () => items.filter((it) => decisions[it.id] === 'accept' && !it.duplicateOf).length,
    [items, decisions],
  )

  function setDecision(id: string, d: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: d }))
  }

  function patch(id: string, p: Partial<ExtractedTransaction>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }))
  }

  async function submit() {
    setError(null)
    setSubmitting(true)
    const body = {
      decisions: items.map((it) => {
        const action = decisions[it.id] ?? 'accept'
        const edited = edits[it.id]
        return {
          pendingId: it.id,
          action,
          edited: edited && Object.keys(edited).length > 0 ? edited : undefined,
        }
      }),
    }
    const { ok, error: err } = await fetchJson(`/api/extract/${batchId}/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!ok) {
      setError(err ?? 'Commit failed')
      setSubmitting(false)
      return
    }
    router.refresh()
    router.push('/transactions')
  }

  if (items.length === 0) {
    return (
      <div className="ios-card p-6 text-center text-[14px]"
        style={{ color: 'rgba(235,235,245,0.55)' }}
      >
        No transactions were extracted.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((it) => (
          <PendingCard
            key={it.id}
            item={it}
            patch={(p) => patch(it.id, p)}
            decision={decisions[it.id] ?? 'accept'}
            setDecision={(d) => setDecision(it.id, d)}
            edits={edits[it.id] ?? {}}
            categoriesByType={categoryOptionsByType}
          />
        ))}
      </div>

      {error && <p className="text-[14px]" style={{ color: '#ff453a' }}>{error}</p>}

      <div
        className="sticky bottom-0 md:static rounded-xl p-3 flex items-center justify-between gap-3"
        style={{
          background: 'rgba(28,28,30,0.9)',
          backdropFilter: 'blur(20px)',
          border: '0.5px solid rgba(84,84,88,0.4)',
        }}
      >
        <p className="text-[13px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
          {toCommit} to commit
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={readOnly || submitting || toCommit === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#0a84ff', color: '#fff' }}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Committing…' : 'Commit accepted'}
        </button>
      </div>
    </div>
  )
}

function PendingCard({
  item,
  patch,
  edits,
  decision,
  setDecision,
  categoriesByType,
}: {
  item: PendingItem
  patch: (p: Partial<ExtractedTransaction>) => void
  edits: Partial<ExtractedTransaction>
  decision: Decision
  setDecision: (d: Decision) => void
  categoriesByType: Record<TransactionType, string[]>
}) {
  const [expanded, setExpanded] = useState(false)
  const merged: ExtractedTransaction = { ...item.draft, ...edits }
  const categoryOptions = categoriesByType[merged.type] ?? []
  const dupe = item.duplicateOf !== null
  const dimmed = decision === 'skip' || dupe
  const displayAmount = merged.amount
  const sign = displayAmount >= 0 ? '+' : '−'
  const colorPos = displayAmount >= 0 ? '#30d158' : '#fff'

  return (
    <div
      className="ios-card p-3 space-y-2"
      style={{ opacity: dimmed ? 0.55 : 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: 'rgba(235,235,245,0.55)' }}>
            <span>{merged.date}</span>
            {item.confidence !== null && item.confidence < 0.75 && (
              <>
                <span>·</span>
                <span style={{ color: '#ff9f0a' }}>
                  {Math.round((item.confidence ?? 0) * 100)}%
                </span>
              </>
            )}
          </div>
          <p className="text-[15px] font-medium text-white truncate">{merged.description}</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium"
              style={{
                background: 'rgba(10,132,255,0.18)',
                color: '#0a84ff',
              }}
            >
              {merged.category}
            </span>
            {dupe && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}
              >
                <AlertTriangle className="h-3 w-3" />
                duplicate
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p
            className="text-[17px] font-semibold tabular-nums"
            style={{ color: colorPos }}
          >
            {sign}${Math.abs(displayAmount).toFixed(2)}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDecision('accept')}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background:
                  decision === 'accept' ? 'rgba(48,209,88,0.2)' : 'rgba(120,120,128,0.14)',
                color: decision === 'accept' ? '#30d158' : 'rgba(235,235,245,0.45)',
              }}
              aria-label="Accept"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDecision('skip')}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background:
                  decision === 'skip' ? 'rgba(255,69,58,0.2)' : 'rgba(120,120,128,0.14)',
                color: decision === 'skip' ? '#ff453a' : 'rgba(235,235,245,0.45)',
              }}
              aria-label="Skip"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[12px] flex items-center gap-1"
        style={{ color: 'rgba(235,235,245,0.5)' }}
      >
        <ChevronDown
          className="h-3 w-3 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
        />
        {expanded ? 'Hide' : 'Edit'}
      </button>

      {expanded && (
        <div className="pt-2 space-y-2 border-t border-[rgba(84,84,88,0.3)]">
          <TypeRow value={merged.type} onChange={(v) => patch({ type: v })} />
          <LabelRow label="Description">
            <input
              value={merged.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="flex-1 bg-transparent text-[14px] outline-none text-white"
            />
          </LabelRow>
          <LabelRow label="Amount">
            <input
              inputMode="decimal"
              value={String(merged.amount)}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (Number.isFinite(v)) patch({ amount: v })
              }}
              className="flex-1 bg-transparent text-[14px] outline-none text-white tabular-nums"
            />
          </LabelRow>
          <LabelRow label="Date">
            <input
              type="date"
              value={merged.date}
              onChange={(e) => patch({ date: e.target.value })}
              className="flex-1 bg-transparent text-[14px] outline-none text-white"
            />
          </LabelRow>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'rgba(235,235,245,0.45)' }}
            >
              Category
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categoryOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patch({ category: c })}
                  className="px-2.5 py-1 rounded-full text-[12px]"
                  style={{
                    background:
                      c === merged.category
                        ? 'rgba(10,132,255,0.2)'
                        : 'rgba(120,120,128,0.14)',
                    color: c === merged.category ? '#0a84ff' : 'rgba(235,235,245,0.7)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider w-20 shrink-0"
        style={{ color: 'rgba(235,235,245,0.45)' }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function TypeRow({ value, onChange }: { value: TransactionType; onChange: (v: TransactionType) => void }) {
  const items: TransactionType[] = ['expense', 'income', 'transfer', 'investment']
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider w-20 shrink-0"
        style={{ color: 'rgba(235,235,245,0.45)' }}
      >
        Type
      </span>
      <div className="flex gap-1">
        {items.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="px-2.5 py-1 rounded-full text-[12px] capitalize"
            style={{
              background: t === value ? 'rgba(10,132,255,0.2)' : 'rgba(120,120,128,0.14)',
              color: t === value ? '#0a84ff' : 'rgba(235,235,245,0.7)',
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
