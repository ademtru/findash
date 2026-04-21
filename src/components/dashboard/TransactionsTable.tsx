'use client'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Search } from 'lucide-react'
import type { Transaction } from '@/types/transaction'

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

export function TransactionsTable({ transactions, selectedType }: TransactionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')

  function setType(type: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (type && type !== 'all') params.set('type', type)
    else params.delete('type')
    router.push(`?${params.toString()}`)
  }

  const filtered = useMemo(() =>
    transactions
      .filter(t => !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, search],
  )

  const activeType = selectedType || 'all'

  return (
    <div className="space-y-3">
      {/* Search + type filters */}
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
            style={{
              background: 'rgba(120,120,128,0.24)',
              caretColor: '#0a84ff',
            }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
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
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block ios-list">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '0.5px solid rgba(84,84,88,0.4)' }}>
              {['Date', 'Description', 'Category', 'Type', 'Amount'].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(235,235,245,0.4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr
                key={t.id}
                style={i < filtered.length - 1 ? { borderBottom: '0.5px solid rgba(84,84,88,0.2)' } : {}}
                className="hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: 'rgba(235,235,245,0.45)' }}>
                  {format(parseISO(t.date), 'MMM d, yyyy')}
                </td>
                <td className="px-5 py-3.5 text-[14px] font-medium text-white">{t.description}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-14 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No transactions found
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-[1px] ios-list overflow-hidden">
        {filtered.map((t, i) => (
          <div
            key={t.id}
            className="px-4 py-3.5 flex justify-between items-center gap-3"
            style={i < filtered.length - 1 ? { borderBottom: '0.5px solid rgba(84,84,88,0.2)' } : {}}
          >
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-white truncate">{t.description}</p>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
                {t.category} · {format(parseISO(t.date), 'MMM d')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-[15px] font-semibold tabular-nums"
                style={{ color: t.amount >= 0 ? '#30d158' : '#ffffff' }}
              >
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
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No transactions found
          </div>
        )}
      </div>
    </div>
  )
}
