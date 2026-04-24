'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Loader2, Pencil, Trash2, Copy } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'
import type { PaceResult } from '@/lib/budgets'

export interface CategoryTransaction {
  id: string
  date: string
  description: string
  amount: number
  groupId?: string | null
  isSubRow?: boolean
}

export interface BudgetCategoryView {
  category: string
  capCents: number | null
  spent: number
  monthBudgetId: string | null
  defaultBudgetId: string | null
  pace: PaceResult | null
  transactions: CategoryTransaction[]
}

type RowEditState = {
  categoryKey: string | null
  value: string
  saving: boolean
}

const EMPTY_EDIT: RowEditState = {
  categoryKey: null,
  value: '',
  saving: false,
}

export function BudgetList({
  month,
  categories,
  canCopyFromPrev,
}: {
  month: string
  categories: BudgetCategoryView[]
  canCopyFromPrev: boolean
}) {
  const router = useRouter()
  const [edit, setEdit] = useState<RowEditState>(EMPTY_EDIT)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)

  function beginEdit(cat: BudgetCategoryView) {
    setError(null)
    setEdit({
      categoryKey: cat.category,
      value: cat.capCents === null ? '' : String((cat.capCents / 100).toFixed(0)),
      saving: false,
    })
  }

  function cancelEdit() {
    setEdit(EMPTY_EDIT)
  }

  async function save(cat: BudgetCategoryView) {
    const parsed = parseFloat(edit.value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a number')
      return
    }
    const capCents = Math.round(parsed * 100)

    setEdit((e) => ({ ...e, saving: true }))
    const { ok, error: err } = await fetchJson('/api/budgets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        month,
        category: cat.category,
        capCents,
      }),
    })
    if (!ok) {
      setError(err ?? 'Save failed')
      setEdit((e) => ({ ...e, saving: false }))
      return
    }
    setEdit(EMPTY_EDIT)
    router.refresh()
  }

  async function remove(id: string) {
    setError(null)
    const { ok, error: err } = await fetchJson(`/api/budgets/${id}`, { method: 'DELETE' })
    if (!ok) {
      setError(err ?? 'Delete failed')
      return
    }
    router.refresh()
  }

  async function copyPrev() {
    setCopying(true)
    const { ok, error: err } = await fetchJson('/api/budgets/copy-last-month', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    setCopying(false)
    if (!ok) {
      setError(err ?? 'Copy failed')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {canCopyFromPrev && !categories.some((c) => c.monthBudgetId) && (
        <button
          type="button"
          onClick={copyPrev}
          disabled={copying}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium"
          style={{ background: 'rgba(10,132,255,0.14)', color: '#0a84ff' }}
        >
          {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          Copy last month's caps
        </button>
      )}

      {error && (
        <p className="text-[14px]" style={{ color: '#ff453a' }}>{error}</p>
      )}

      <div className="ios-card divide-y divide-[rgba(84,84,88,0.3)]">
        {categories.length === 0 && (
          <p className="p-6 text-center text-[14px]" style={{ color: 'rgba(235,235,245,0.55)' }}>
            No categories yet. Add a transaction or scan a receipt first.
          </p>
        )}
        {categories.map((c) => (
          <CategoryRow
            key={c.category}
            cat={c}
            editing={edit.categoryKey === c.category}
            editState={edit}
            expanded={expandedKey === c.category}
            onToggleExpand={() =>
              setExpandedKey((k) => (k === c.category ? null : c.category))
            }
            onBeginEdit={() => beginEdit(c)}
            onCancel={cancelEdit}
            onSave={() => save(c)}
            onChange={(v) => setEdit((e) => ({ ...e, value: v }))}
            onRemove={() => {
              if (c.monthBudgetId) void remove(c.monthBudgetId)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryRow({
  cat,
  editing,
  editState,
  expanded,
  onToggleExpand,
  onBeginEdit,
  onCancel,
  onSave,
  onChange,
  onRemove,
}: {
  cat: BudgetCategoryView
  editing: boolean
  editState: RowEditState
  expanded: boolean
  onToggleExpand: () => void
  onBeginEdit: () => void
  onCancel: () => void
  onSave: () => void
  onChange: (v: string) => void
  onRemove: () => void
}) {
  const pace = cat.pace
  const capDollars = cat.capCents === null ? null : cat.capCents / 100
  const hasCap = capDollars !== null
  const hasTransactions = cat.transactions.length > 0

  const barColor =
    pace?.status === 'over' ? '#ff453a' :
    pace?.status === 'under' ? '#30d158' :
    pace?.status === 'on-track' ? '#0a84ff' :
    'rgba(120,120,128,0.4)'

  const pctWidth = hasCap ? Math.min(100, (pace?.percentUsed ?? 0) * 100) : 0

  return (
    <div>
      <div className="relative">
        <button
          type="button"
          onClick={onToggleExpand}
          disabled={!hasTransactions}
          className="w-full text-left px-4 py-3 pr-28 disabled:cursor-default"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-medium text-white truncate">{cat.category}</p>
                {hasTransactions && (
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 transition-transform"
                    style={{
                      color: 'rgba(235,235,245,0.4)',
                      transform: expanded ? 'rotate(180deg)' : undefined,
                    }}
                  />
                )}
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(235,235,245,0.5)' }}>
                ${cat.spent.toFixed(0)}
                {hasCap && ` of $${capDollars.toFixed(0)}`}
                {pace?.status === 'over' && hasCap && (
                  <span className="ml-2" style={{ color: '#ff453a' }}>over</span>
                )}
                {pace?.status === 'under' && hasCap && (
                  <span className="ml-2" style={{ color: '#30d158' }}>under pace</span>
                )}
                {!hasCap && (
                  <span className="ml-2" style={{ color: 'rgba(235,235,245,0.4)' }}>no cap</span>
                )}
                {hasTransactions && (
                  <span className="ml-2" style={{ color: 'rgba(235,235,245,0.35)' }}>
                    · {cat.transactions.length} txn{cat.transactions.length === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {hasCap && !editing && (
            <div
              className="mt-2 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(120,120,128,0.2)' }}
            >
              <div
                className="h-full transition-all"
                style={{ width: `${pctWidth}%`, background: barColor }}
              />
            </div>
          )}
        </button>

        {!editing && (
          <div className="absolute top-3 right-4 flex items-center gap-1">
            <button
              type="button"
              onClick={onBeginEdit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium"
              style={{
                background: hasCap ? 'rgba(120,120,128,0.16)' : 'rgba(10,132,255,0.14)',
                color: hasCap ? 'rgba(235,235,245,0.8)' : '#0a84ff',
              }}
            >
              <Pencil className="h-3 w-3" />
              {hasCap ? 'Edit' : 'Set cap'}
            </button>
            {cat.monthBudgetId && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded-md"
                style={{ color: 'rgba(235,235,245,0.5)' }}
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <span className="text-[15px]" style={{ color: 'rgba(235,235,245,0.5)' }}>$</span>
          <input
            autoFocus
            inputMode="decimal"
            type="text"
            value={editState.value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancel()
            }}
            placeholder="0"
            className="flex-1 bg-transparent text-[17px] font-semibold outline-none text-white border-b border-[rgba(84,84,88,0.5)] py-1"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={editState.saving}
            className="p-1.5 rounded-md"
            style={{ background: '#0a84ff', color: '#fff' }}
          >
            {editState.saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 rounded-md text-[12px]"
            style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {expanded && hasTransactions && (
        <div
          className="px-4 pb-3 space-y-1.5"
          style={{ borderTop: '0.5px solid rgba(84,84,88,0.3)' }}
        >
          {cat.transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 py-1.5"
              style={t.isSubRow ? { paddingLeft: '16px', borderTop: '0.5px solid rgba(255,204,0,0.15)' } : undefined}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {t.isSubRow && (
                    <span className="shrink-0 text-[11px]" style={{ color: 'rgba(255,204,0,0.5)' }}>↳</span>
                  )}
                  <p
                    className="truncate"
                    style={{
                      fontSize: t.isSubRow ? '12px' : '13px',
                      color: t.isSubRow ? 'rgba(235,235,245,0.6)' : '#fff',
                    }}
                  >
                    {t.description}
                  </p>
                </div>
                <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.45)', paddingLeft: t.isSubRow ? '14px' : undefined }}>
                  {t.date}
                </p>
              </div>
              <p
                className="font-semibold tabular-nums shrink-0"
                style={{
                  fontSize: t.isSubRow ? '12px' : '13px',
                  color: t.amount >= 0 ? '#30d158' : (t.isSubRow ? 'rgba(235,235,245,0.6)' : '#fff'),
                }}
              >
                {t.amount >= 0 ? '+' : '−'}${Math.abs(t.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
