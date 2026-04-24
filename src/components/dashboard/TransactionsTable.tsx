'use client'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Search, Trash2, Check, X, Loader2, Link2, Unlink2 } from 'lucide-react'
import type { Transaction } from '@/types/transaction'
import { fetchJson } from '@/lib/fetch-json'

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  income:     { color: '#30d158', bg: 'rgba(48,209,88,0.15)'  },
  expense:    { color: '#ff453a', bg: 'rgba(255,69,58,0.15)'  },
  investment: { color: '#bf5af2', bg: 'rgba(191,90,242,0.15)' },
  transfer:   { color: '#40c8e0', bg: 'rgba(64,200,224,0.15)' },
}

const TYPES = ['all', 'income', 'expense', 'investment', 'transfer']

interface TransactionsTableProps {
  transactions: Transaction[]
  selectedType?: string
}

type GroupItem = {
  primary: Transaction
  subs: Transaction[]
  groupNet?: number  // defined when 2+ members visible
}

export function TransactionsTable({ transactions, selectedType }: TransactionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')

  // delete state
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // combine state
  const [combineMode, setCombineMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [combining, setCombining] = useState(false)
  const [combineError, setCombineError] = useState<string | null>(null)
  const [ungroupingIds, setUngroupingIds] = useState<Set<string>>(new Set())

  function setType(type: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (type && type !== 'all') params.set('type', type)
    else params.delete('type')
    router.push(`?${params.toString()}`)
  }

  async function confirmDelete(id: string) {
    setDeleteError(null)
    setDeletingIds((s) => new Set(s).add(id))
    const { ok, error } = await fetchJson(`/api/transactions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n })
    if (!ok) { setDeleteError(error ?? 'Delete failed'); return }
    setRemovedIds((s) => new Set(s).add(id))
    setPendingDelete(null)
    router.refresh()
  }

  function startCombineFrom(id: string) {
    setCombineMode(true)
    setSelectedIds(new Set([id]))
    setCombineError(null)
    setPendingDelete(null)
  }

  function exitCombineMode() {
    setCombineMode(false)
    setSelectedIds(new Set())
    setCombineError(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function confirmCombine() {
    setCombineError(null)
    setCombining(true)
    const { ok, error } = await fetchJson('/api/transaction-groups', {
      method: 'POST',
      body: JSON.stringify({ transactionIds: Array.from(selectedIds) }),
    })
    setCombining(false)
    if (!ok) { setCombineError(error ?? 'Combine failed'); return }
    exitCombineMode()
    router.refresh()
  }

  async function ungroup(groupId: string) {
    setUngroupingIds((s) => new Set(s).add(groupId))
    await fetchJson(`/api/transaction-groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' })
    setUngroupingIds((s) => { const n = new Set(s); n.delete(groupId); return n })
    router.refresh()
  }

  // Grouped items: each item has a primary + optional sub-rows
  const items = useMemo<GroupItem[]>(() => {
    const visible = transactions
      .filter(t => !removedIds.has(t.id))
      .filter(t => !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()))

    const groupMap = new Map<string, Transaction[]>()
    const singles: Transaction[] = []

    for (const t of visible) {
      if (t.groupId) {
        const arr = groupMap.get(t.groupId) ?? []
        arr.push(t)
        groupMap.set(t.groupId, arr)
      } else {
        singles.push(t)
      }
    }

    const result: (GroupItem & { _date: string })[] = []

    for (const t of singles) {
      result.push({ _date: t.date, primary: t, subs: [] })
    }

    for (const [, members] of groupMap) {
      const groupNet = members.reduce((s, m) => s + m.amount, 0)
      const expenses = members.filter(m => m.type === 'expense')
      const primary = expenses.length > 0
        ? expenses.reduce((a, b) => Math.abs(a.amount) >= Math.abs(b.amount) ? a : b)
        : members.reduce((a, b) => a.amount <= b.amount ? a : b)
      const subs = members
        .filter(m => m.id !== primary.id)
        .sort((a, b) => b.amount - a.amount)

      result.push({
        _date: primary.date,
        primary,
        subs: members.length > 1 ? subs : [],
        groupNet: members.length > 1 ? groupNet : undefined,
      })
    }

    result.sort((a, b) => b._date.localeCompare(a._date))
    return result
  }, [transactions, search, removedIds])

  const selectedNetAmount = useMemo(() =>
    transactions.filter(t => selectedIds.has(t.id)).reduce((s, t) => s + t.amount, 0),
    [transactions, selectedIds],
  )

  const activeType = selectedType || 'all'

  function formatNet(amount: number) {
    const sign = amount >= 0 ? '+' : ''
    return `${sign}$${Math.abs(amount).toFixed(2)}`
  }

  function AmountCell({ t, isSub }: { t: Transaction; isSub?: boolean }) {
    return (
      <span
        className={`${isSub ? 'text-[13px]' : 'text-[14px]'} font-semibold tabular-nums`}
        style={{ color: t.amount >= 0 ? '#30d158' : isSub ? 'rgba(235,235,245,0.55)' : '#ffffff' }}
      >
        {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
      </span>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + type filters + combine toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative sm:max-w-[260px] w-full">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: 'rgba(235,235,245,0.35)' }}
          />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-[10px] pl-9 pr-4 py-2.5 text-[15px] text-white outline-none transition-all"
            style={{ background: 'rgba(120,120,128,0.24)', caretColor: '#0a84ff' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center flex-1">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setType(type)}
              className="px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150 capitalize cursor-pointer"
              style={
                activeType === type
                  ? { background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }
                  : { background: 'rgba(120,120,128,0.18)', color: 'rgba(235,235,245,0.55)' }
              }
            >
              {type}
            </button>
          ))}
          <button
            onClick={() => combineMode ? exitCombineMode() : setCombineMode(true)}
            className="ml-auto p-2 rounded-[8px] transition-all duration-150 cursor-pointer"
            title={combineMode ? 'Exit combine mode' : 'Combine transactions'}
            style={
              combineMode
                ? { background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }
                : { background: 'rgba(120,120,128,0.18)', color: 'rgba(235,235,245,0.55)' }
            }
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Combine mode bar */}
      {combineMode && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[10px] text-[13px]"
          style={{ background: 'rgba(10,132,255,0.1)', border: '0.5px solid rgba(10,132,255,0.3)' }}
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#0a84ff' }} />
          <span style={{ color: 'rgba(235,235,245,0.7)' }}>
            {selectedIds.size === 0 ? 'Tap transactions to select them' : `${selectedIds.size} selected`}
          </span>
          {selectedIds.size >= 2 && (
            <span className="font-semibold tabular-nums" style={{ color: selectedNetAmount >= 0 ? '#30d158' : '#ff453a' }}>
              Net: {formatNet(selectedNetAmount)}
            </span>
          )}
          {combineError && <span style={{ color: '#ff453a' }}>{combineError}</span>}
          <div className="ml-auto flex gap-2">
            {selectedIds.size >= 2 && (
              <button
                type="button"
                onClick={confirmCombine}
                disabled={combining}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold"
                style={{ background: 'rgba(10,132,255,0.2)', color: '#0a84ff' }}
              >
                {combining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                Combine
              </button>
            )}
            <button
              type="button"
              onClick={exitCombineMode}
              className="px-3 py-1.5 rounded-[7px] text-[12px] font-medium"
              style={{ background: 'rgba(120,120,128,0.18)', color: 'rgba(235,235,245,0.6)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <p className="text-[13px]" style={{ color: '#ff453a' }}>{deleteError}</p>
      )}

      {/* Desktop table */}
      <div className="hidden md:block ios-list">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '0.5px solid rgba(84,84,88,0.4)' }}>
              {['Date', 'Description', 'Category', 'Type', 'Amount', ''].map((h, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(235,235,245,0.4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, itemIdx) => {
              const t = item.primary
              const hasSubs = item.subs.length > 0
              const isLastItem = itemIdx === items.length - 1
              const isPending = pendingDelete === t.id
              const isDeleting = deletingIds.has(t.id)
              const isSelected = selectedIds.has(t.id)
              const isGrouped = !!t.groupId
              const isUngrouping = isGrouped && ungroupingIds.has(t.groupId!)

              return [
                // Primary row
                <tr
                  key={t.id}
                  onClick={combineMode ? () => toggleSelect(t.id) : undefined}
                  style={{
                    borderBottom: hasSubs ? 'none' : (!isLastItem ? '0.5px solid rgba(84,84,88,0.2)' : undefined),
                    ...(isSelected ? { background: 'rgba(10,132,255,0.08)' } : {}),
                    ...(combineMode ? { cursor: 'pointer' } : {}),
                  }}
                  className={`group transition-colors ${!combineMode ? 'hover:bg-[rgba(255,255,255,0.03)]' : 'hover:bg-[rgba(10,132,255,0.05)]'}`}
                >
                  <td
                    className="px-5 py-3.5 text-[13px] tabular-nums"
                    style={{
                      color: 'rgba(235,235,245,0.45)',
                      borderLeft: isSelected
                        ? '3px solid rgba(10,132,255,0.7)'
                        : isGrouped
                        ? '3px solid rgba(255,204,0,0.5)'
                        : '3px solid transparent',
                    }}
                  >
                    {format(parseISO(t.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3.5 text-[14px] font-medium text-white">
                    <div className="flex items-center gap-1.5">
                      {t.description}
                      {isGrouped && item.groupNet !== undefined && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-[5px] text-[10px] font-semibold tabular-nums shrink-0"
                          style={{ color: 'rgba(255,204,0,0.85)', background: 'rgba(255,204,0,0.12)' }}
                        >
                          <Link2 className="h-2.5 w-2.5" />
                          {formatNet(item.groupNet)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px]" style={{ color: 'rgba(235,235,245,0.5)' }}>
                    {t.category}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="px-2.5 py-[3px] rounded-[6px] text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: TYPE_CONFIG[t.type]?.color, background: TYPE_CONFIG[t.type]?.bg }}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[14px]"
                    style={{ color: t.amount >= 0 ? '#30d158' : '#ffffff' }}>
                    {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-3.5 w-[120px] text-right">
                    {combineMode ? (
                      <div className="inline-flex items-center justify-center h-5 w-5 rounded-full border transition-all"
                        style={isSelected ? { background: '#0a84ff', borderColor: '#0a84ff' } : { background: 'transparent', borderColor: 'rgba(235,235,245,0.3)' }}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    ) : isPending ? (
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => confirmDelete(t.id)} disabled={isDeleting}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold"
                          style={{ background: 'rgba(255,69,58,0.18)', color: '#ff453a' }}>
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Delete
                        </button>
                        <button type="button" onClick={() => setPendingDelete(null)}
                          className="p-1 rounded-md" style={{ color: 'rgba(235,235,245,0.5)' }}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isGrouped && (
                          <button type="button" onClick={() => ungroup(t.groupId!)} disabled={isUngrouping}
                            className="p-1.5 rounded-md" style={{ color: 'rgba(255,204,0,0.7)' }} title="Ungroup">
                            {isUngrouping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {!isGrouped && (
                          <button type="button" onClick={() => startCombineFrom(t.id)}
                            className="p-1.5 rounded-md" style={{ color: 'rgba(235,235,245,0.4)' }} title="Combine">
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => { setPendingDelete(t.id); setDeleteError(null) }}
                          className="p-1.5 rounded-md" style={{ color: 'rgba(235,235,245,0.5)' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>,

                // Sub-rows
                ...item.subs.map((s, si) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: si === item.subs.length - 1 && !isLastItem
                        ? '0.5px solid rgba(84,84,88,0.2)'
                        : 'none',
                      background: 'rgba(255,204,0,0.02)',
                    }}
                  >
                    <td
                      className="py-2 pl-5 pr-2 text-[12px] tabular-nums"
                      style={{
                        color: 'rgba(235,235,245,0.3)',
                        borderLeft: '3px solid rgba(255,204,0,0.3)',
                      }}
                    >
                      <span style={{ color: 'rgba(255,204,0,0.45)' }}>↳</span>
                    </td>
                    <td className="py-2 px-5">
                      <div className="flex items-center gap-1.5 pl-2">
                        <span className="text-[13px]" style={{ color: 'rgba(235,235,245,0.55)' }}>
                          {s.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-5 text-[12px]" style={{ color: 'rgba(235,235,245,0.3)' }}>
                      {s.category}
                    </td>
                    <td className="py-2 px-5">
                      <span
                        className="px-2 py-[2px] rounded-[5px] text-[10px] font-semibold uppercase tracking-wide opacity-60"
                        style={{ color: TYPE_CONFIG[s.type]?.color, background: TYPE_CONFIG[s.type]?.bg }}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="py-2 px-5 text-right">
                      <AmountCell t={s} isSub />
                    </td>
                    <td className="py-2 px-3 w-[120px]" />
                  </tr>
                )),
              ]
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-14 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No transactions found
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-[1px] ios-list overflow-hidden">
        {items.map((item, itemIdx) => {
          const t = item.primary
          const hasSubs = item.subs.length > 0
          const isPending = pendingDelete === t.id
          const isDeleting = deletingIds.has(t.id)
          const isSelected = selectedIds.has(t.id)
          const isGrouped = !!t.groupId
          const isUngrouping = isGrouped && ungroupingIds.has(t.groupId!)

          return (
            <div
              key={t.id}
              style={{
                borderBottom: itemIdx < items.length - 1 ? '0.5px solid rgba(84,84,88,0.2)' : undefined,
                borderLeft: isSelected
                  ? '3px solid rgba(10,132,255,0.7)'
                  : isGrouped
                  ? '3px solid rgba(255,204,0,0.5)'
                  : '3px solid transparent',
                ...(isSelected ? { background: 'rgba(10,132,255,0.08)' } : {}),
              }}
            >
              {/* Primary row */}
              <div className="px-4 py-3.5">
                <div className="flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => combineMode ? toggleSelect(t.id) : setPendingDelete(cur => cur === t.id ? null : t.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-medium text-white truncate">{t.description}</p>
                      {isGrouped && item.groupNet !== undefined && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-[5px] text-[10px] font-semibold shrink-0"
                          style={{ color: 'rgba(255,204,0,0.85)', background: 'rgba(255,204,0,0.12)' }}
                        >
                          <Link2 className="h-2.5 w-2.5" />
                          {formatNet(item.groupNet)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
                      {t.category} · {format(parseISO(t.date), 'MMM d')}
                    </p>
                  </button>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    {combineMode && (
                      <div
                        className="inline-flex items-center justify-center h-5 w-5 rounded-full border transition-all"
                        style={isSelected
                          ? { background: '#0a84ff', borderColor: '#0a84ff' }
                          : { background: 'transparent', borderColor: 'rgba(235,235,245,0.3)' }
                        }
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums"
                        style={{ color: t.amount >= 0 ? '#30d158' : '#ffffff' }}>
                        {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                      </p>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-[2px] rounded uppercase tracking-wide"
                        style={{ color: TYPE_CONFIG[t.type]?.color, background: TYPE_CONFIG[t.type]?.bg }}
                      >
                        {t.type}
                      </span>
                    </div>
                  </div>
                </div>

                {isPending && !combineMode && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button type="button" onClick={() => confirmDelete(t.id)} disabled={isDeleting}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold"
                      style={{ background: 'rgba(255,69,58,0.18)', color: '#ff453a' }}>
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Delete
                    </button>
                    {!isGrouped && (
                      <button type="button" onClick={() => startCombineFrom(t.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold"
                        style={{ background: 'rgba(10,132,255,0.12)', color: '#0a84ff' }}>
                        <Link2 className="h-3 w-3" />
                        Combine
                      </button>
                    )}
                    {isGrouped && (
                      <button type="button" onClick={() => ungroup(t.groupId!)} disabled={isUngrouping}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold"
                        style={{ background: 'rgba(255,204,0,0.1)', color: 'rgba(255,204,0,0.85)' }}>
                        {isUngrouping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink2 className="h-3 w-3" />}
                        Ungroup
                      </button>
                    )}
                    <button type="button" onClick={() => setPendingDelete(null)}
                      className="px-3 py-1.5 rounded-md text-[12px] font-medium"
                      style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-rows inline within the card */}
              {hasSubs && item.subs.map((s, si) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 pl-8 pr-4 py-2"
                  style={{
                    borderTop: si === 0 ? '0.5px solid rgba(255,204,0,0.15)' : undefined,
                    background: 'rgba(255,204,0,0.02)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] shrink-0" style={{ color: 'rgba(255,204,0,0.45)' }}>↳</span>
                    <div className="min-w-0">
                      <p className="text-[13px] truncate" style={{ color: 'rgba(235,235,245,0.55)' }}>
                        {s.description}
                      </p>
                      <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.3)' }}>
                        {s.category}
                      </p>
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums shrink-0"
                    style={{ color: s.amount >= 0 ? '#30d158' : 'rgba(235,235,245,0.5)' }}>
                    {s.amount >= 0 ? '+' : ''}${Math.abs(s.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )
        })}
        {items.length === 0 && (
          <div className="text-center py-12 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No transactions found
          </div>
        )}
      </div>
    </div>
  )
}
