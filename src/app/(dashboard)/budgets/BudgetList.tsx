'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Loader2, Merge, Pencil, Plus, Trash2, Copy, X } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'
import type { PaceResult } from '@/lib/budgets'
import { DEFAULT_CATEGORIES } from '@/lib/categories'

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
  userHistoryCategories,
}: {
  month: string
  categories: BudgetCategoryView[]
  canCopyFromPrev: boolean
  userHistoryCategories: string[]
}) {
  const router = useRouter()
  const [edit, setEdit] = useState<RowEditState>(EMPTY_EDIT)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)

  // Add category state
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Merge state
  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set())
  const [mergeTarget, setMergeTarget] = useState('')
  const [mergeSaving, setMergeSaving] = useState(false)

  useEffect(() => {
    if (addOpen) addInputRef.current?.focus()
  }, [addOpen])

  function beginEdit(cat: BudgetCategoryView | { category: string; capCents: number | null }) {
    setError(null)
    setEdit({
      categoryKey: cat.category,
      value: cat.capCents === null ? '' : String((cat.capCents / 100).toFixed(0)),
      saving: false,
    })
  }

  function cancelEdit() {
    setEdit(EMPTY_EDIT)
    if (pendingCategory && edit.categoryKey === pendingCategory) {
      setPendingCategory(null)
    }
  }

  async function save(cat: BudgetCategoryView | { category: string; capCents: number | null }) {
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
      body: JSON.stringify({ month, category: cat.category, capCents }),
    })
    if (!ok) {
      setError(err ?? 'Save failed')
      setEdit((e) => ({ ...e, saving: false }))
      return
    }
    setEdit(EMPTY_EDIT)
    setPendingCategory(null)
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

  function selectAddCategory(name: string) {
    setPendingCategory(name)
    setAddOpen(false)
    setAddSearch('')
    beginEdit({ category: name, capCents: null })
  }

  function toggleMergeMode() {
    setMergeMode((m) => !m)
    setMergeSelected(new Set())
    setMergeTarget('')
  }

  function toggleMergeSelect(category: string) {
    setMergeSelected((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
        if (next.size === 1) setMergeTarget(category)
      }
      return next
    })
  }

  async function doMerge() {
    if (mergeSelected.size < 2 || !mergeTarget.trim()) return
    setMergeSaving(true)
    const from = [...mergeSelected].filter((c) => c !== mergeTarget.trim())
    const { ok, error: err } = await fetchJson('/api/categories/merge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: mergeTarget.trim() }),
    })
    setMergeSaving(false)
    if (!ok) {
      setError(err ?? 'Merge failed')
      return
    }
    setMergeMode(false)
    setMergeSelected(new Set())
    setMergeTarget('')
    router.refresh()
  }

  const existingCategoryNames = new Set(categories.map((c) => c.category))
  const defaultExpense = DEFAULT_CATEGORIES.expense
  const categoryPool = [
    ...defaultExpense,
    ...userHistoryCategories.filter((c) => !defaultExpense.includes(c)),
  ]
  const filteredSuggestions = addSearch.trim()
    ? categoryPool.filter((c) => c.toLowerCase().includes(addSearch.toLowerCase()))
    : []
  const showCreateOption =
    addSearch.trim().length > 0 &&
    !existingCategoryNames.has(addSearch.trim()) &&
    !filteredSuggestions.some((c) => c.toLowerCase() === addSearch.trim().toLowerCase())

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {canCopyFromPrev && !categories.some((c) => c.monthBudgetId) && (
          <button
            type="button"
            onClick={copyPrev}
            disabled={copying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium"
            style={{ background: 'rgba(10,132,255,0.14)', color: '#0a84ff' }}
          >
            {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Copy last month's caps
          </button>
        )}

        {!mergeMode && (
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium"
            style={{ background: 'rgba(48,209,88,0.14)', color: '#30d158' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add category
          </button>
        )}

        {!addOpen && (
          <button
            type="button"
            onClick={toggleMergeMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium"
            style={{
              background: mergeMode ? 'rgba(255,69,58,0.14)' : 'rgba(120,120,128,0.16)',
              color: mergeMode ? '#ff453a' : 'rgba(235,235,245,0.7)',
            }}
          >
            {mergeMode ? <X className="h-3.5 w-3.5" /> : <Merge className="h-3.5 w-3.5" />}
            {mergeMode ? 'Cancel merge' : 'Merge...'}
          </button>
        )}
      </div>

      {/* Add category combobox */}
      {addOpen && (
        <div
          className="ios-card p-3 space-y-2"
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setAddOpen(false); setAddSearch('') }
          }}
        >
          <input
            ref={addInputRef}
            type="text"
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
            placeholder="Search or type a new category…"
            className="w-full bg-transparent text-[14px] text-white outline-none border-b border-[rgba(84,84,88,0.5)] pb-2"
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredSuggestions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectAddCategory(c)}
                className="w-full text-left px-2 py-1.5 rounded-md text-[13px] hover:bg-[rgba(120,120,128,0.2)] text-white"
              >
                {c}
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                onClick={() => selectAddCategory(addSearch.trim())}
                className="w-full text-left px-2 py-1.5 rounded-md text-[13px] hover:bg-[rgba(120,120,128,0.2)]"
                style={{ color: '#30d158' }}
              >
                + Add &quot;{addSearch.trim()}&quot;
              </button>
            )}
            {filteredSuggestions.length === 0 && !showCreateOption && addSearch.trim() && (
              <p className="px-2 py-2 text-[13px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
                No matches
              </p>
            )}
            {!addSearch.trim() && (
              <p className="px-2 py-2 text-[13px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
                Type to search or create a category
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[14px]" style={{ color: '#ff453a' }}>{error}</p>
      )}

      <div className="ios-card divide-y divide-[rgba(84,84,88,0.3)]">
        {categories.length === 0 && !pendingCategory && (
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
            mergeMode={mergeMode}
            mergeChecked={mergeSelected.has(c.category)}
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
            onToggleMerge={() => toggleMergeSelect(c.category)}
          />
        ))}

        {pendingCategory && (
          <PendingCategoryRow
            category={pendingCategory}
            editState={edit}
            onSave={() => save({ category: pendingCategory, capCents: null })}
            onCancel={() => {
              setPendingCategory(null)
              setEdit(EMPTY_EDIT)
            }}
            onChange={(v) => setEdit((e) => ({ ...e, value: v }))}
          />
        )}
      </div>

      {/* Merge bottom bar */}
      {mergeMode && mergeSelected.size >= 2 && (
        <div
          className="ios-card p-3 space-y-2"
        >
          <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>
            Merge {mergeSelected.size} categories into:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              placeholder="Canonical name"
              className="flex-1 bg-transparent text-[15px] font-medium text-white outline-none border-b border-[rgba(84,84,88,0.5)] py-1"
            />
            <button
              type="button"
              onClick={doMerge}
              disabled={mergeSaving || !mergeTarget.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold"
              style={{ background: '#ff453a', color: '#fff', opacity: mergeSaving || !mergeTarget.trim() ? 0.5 : 1 }}
            >
              {mergeSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Merge className="h-3.5 w-3.5" />}
              Merge
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[...mergeSelected].map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded-full text-[11px]"
                style={{
                  background: c === mergeTarget.trim() ? 'rgba(10,132,255,0.2)' : 'rgba(120,120,128,0.2)',
                  color: c === mergeTarget.trim() ? '#0a84ff' : 'rgba(235,235,245,0.7)',
                }}
              >
                {c === mergeTarget.trim() ? '✓ ' : ''}{c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PendingCategoryRow({
  category,
  editState,
  onSave,
  onCancel,
  onChange,
}: {
  category: string
  editState: RowEditState
  onSave: () => void
  onCancel: () => void
  onChange: (v: string) => void
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[15px] font-medium text-white mb-2">{category}</p>
      <div className="flex items-center gap-2">
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
          placeholder="Set cap"
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
    </div>
  )
}

function CategoryRow({
  cat,
  editing,
  editState,
  expanded,
  mergeMode,
  mergeChecked,
  onToggleExpand,
  onBeginEdit,
  onCancel,
  onSave,
  onChange,
  onRemove,
  onToggleMerge,
}: {
  cat: BudgetCategoryView
  editing: boolean
  editState: RowEditState
  expanded: boolean
  mergeMode: boolean
  mergeChecked: boolean
  onToggleExpand: () => void
  onBeginEdit: () => void
  onCancel: () => void
  onSave: () => void
  onChange: (v: string) => void
  onRemove: () => void
  onToggleMerge: () => void
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
        {mergeMode && (
          <button
            type="button"
            onClick={onToggleMerge}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center shrink-0 z-10"
            style={{
              background: mergeChecked ? '#0a84ff' : 'rgba(120,120,128,0.2)',
              border: mergeChecked ? 'none' : '1.5px solid rgba(120,120,128,0.4)',
            }}
            aria-label={mergeChecked ? 'Deselect' : 'Select for merge'}
          >
            {mergeChecked && <Check className="h-3 w-3 text-white" />}
          </button>
        )}

        <button
          type="button"
          onClick={mergeMode ? onToggleMerge : onToggleExpand}
          disabled={!mergeMode && !hasTransactions}
          className="w-full text-left py-3 pr-28 disabled:cursor-default"
          style={{ paddingLeft: mergeMode ? '44px' : '16px' }}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-medium text-white truncate">{cat.category}</p>
                {!mergeMode && hasTransactions && (
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

        {!editing && !mergeMode && (
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
