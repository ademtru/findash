'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Loader2, Scissors } from 'lucide-react'
import { mergeCategoriesForType } from '@/lib/categories'
import { fetchJson } from '@/lib/fetch-json'
import { validateSplits } from '@/lib/transactions/split'
import type { Transaction } from '@/types/transaction'

interface SplitRow {
  amount: string
  description: string
  category: string
}

interface SplitTransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

export function SplitTransactionModal({ transaction, onClose }: SplitTransactionModalProps) {
  const router = useRouter()
  const originalAbs = Math.abs(transaction.amount)
  const sign = transaction.amount < 0 ? -1 : 1

  const [rows, setRows] = useState<SplitRow[]>([
    { amount: String(originalAbs), description: transaction.description, category: transaction.category },
    { amount: '0', description: '', category: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = useMemo(
    () => mergeCategoriesForType(transaction.type, []),
    [transaction.type],
  )

  const parsedSplits = rows.map((r) => ({
    amount: sign * Math.abs(parseFloat(r.amount) || 0),
    description: r.description,
    category: r.category,
  }))

  const totalAssigned = parsedSplits.reduce((s, r) => s + Math.abs(r.amount), 0)
  const validationError = validateSplits(transaction.amount, parsedSplits)
  const canSubmit = !validationError && rows.every((r) => r.description.trim() && r.category)

  function updateRow(index: number, field: keyof SplitRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows((prev) => [...prev, { amount: '0', description: '', category: '' }])
  }

  function removeRow(index: number) {
    if (rows.length <= 2) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function confirm() {
    setError(null)
    if (!canSubmit) return
    setSubmitting(true)
    const { ok, error: err } = await fetchJson(
      `/api/transactions/${encodeURIComponent(transaction.id)}/split`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ splits: parsedSplits }),
      },
    )
    setSubmitting(false)
    if (!ok) { setError(err ?? 'Split failed'); return }
    router.refresh()
    onClose()
  }

  const balanced = Math.abs(totalAssigned - originalAbs) < 0.005

  if (transaction.type === 'investment') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: '#1c1c1e' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-white">Split Transaction</h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full"
              style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.6)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[14px]" style={{ color: '#ff453a' }}>Investment transactions cannot be split.</p>
          <button type="button" onClick={onClose}
            className="w-full py-3 rounded-xl text-[15px] font-medium"
            style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: '#1c1c1e' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4" style={{ color: 'rgba(235,235,245,0.5)' }} />
            <h2 className="text-[17px] font-semibold text-white">Split Transaction</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full"
            style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.6)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Original */}
        <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(120,120,128,0.12)' }}>
          <p className="text-[13px] text-white font-medium">{transaction.description}</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
            Original: ${originalAbs.toFixed(2)} · {transaction.date}
          </p>
        </div>

        {/* Running total */}
        <div className="flex items-center justify-between text-[13px]">
          <span style={{ color: 'rgba(235,235,245,0.5)' }}>Assigned</span>
          <span className="font-semibold tabular-nums"
            style={{ color: balanced ? '#30d158' : totalAssigned > originalAbs ? '#ff453a' : '#ff9f0a' }}>
            ${totalAssigned.toFixed(2)} / ${originalAbs.toFixed(2)}
          </span>
        </div>

        {/* Split rows */}
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl p-3 space-y-2.5"
              style={{ background: 'rgba(120,120,128,0.1)', border: '0.5px solid rgba(84,84,88,0.3)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.35)' }}>
                  Split {i + 1}
                </span>
                {rows.length > 2 && (
                  <button type="button" onClick={() => removeRow(i)}
                    className="p-1 rounded" style={{ color: 'rgba(255,69,58,0.6)' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Amount */}
              <div className="flex items-center gap-1.5">
                <span className="text-[18px] font-semibold" style={{ color: 'rgba(235,235,245,0.4)' }}>$</span>
                <input inputMode="decimal" type="text" value={row.amount}
                  onChange={(e) => updateRow(i, 'amount', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 bg-transparent text-[22px] font-semibold outline-none text-white" />
              </div>

              {/* Description */}
              <input type="text" placeholder="Description" value={row.description}
                onChange={(e) => updateRow(i, 'description', e.target.value)}
                className="w-full bg-transparent text-[15px] outline-none text-white py-0.5 border-b"
                style={{ borderColor: 'rgba(84,84,88,0.4)' }} />

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {categoryOptions.map((c) => (
                  <button key={c} type="button" onClick={() => updateRow(i, 'category', c)}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
                    style={row.category === c
                      ? { background: 'rgba(10,132,255,0.2)', color: '#0a84ff' }
                      : { background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.65)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add split */}
        <button type="button" onClick={addRow}
          className="w-full py-2 rounded-xl text-[14px] font-medium flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(120,120,128,0.12)', color: 'rgba(235,235,245,0.55)' }}>
          <Plus className="h-4 w-4" /> Add split
        </button>

        {error && <p className="text-[13px]" style={{ color: '#ff453a' }}>{error}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl text-[15px] font-medium"
            style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!canSubmit || submitting}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0a84ff', color: '#fff' }}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Splitting…</> : 'Split'}
          </button>
        </div>
      </div>
    </div>
  )
}
