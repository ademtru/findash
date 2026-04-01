'use client'
import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Search } from 'lucide-react'
import type { Transaction } from '@/types/transaction'

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  income:     { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  expense:    { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  investment: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  transfer:   { color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
}

const TYPES = ['all', 'income', 'expense', 'investment', 'transfer']

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => transactions
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, search, typeFilter]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative sm:max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(type => (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize cursor-pointer ${
                typeFilter === type
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10'
              }`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:block glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Description</th>
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}>
                <td className="px-5 py-3.5 text-xs text-slate-500 tabular-nums">{format(parseISO(t.date), 'MMM d, yyyy')}</td>
                <td className="px-5 py-3.5 text-sm text-slate-200 font-medium">{t.description}</td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{t.category}</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: TYPE_CONFIG[t.type]?.color, background: TYPE_CONFIG[t.type]?.bg }}>
                    {t.type}
                  </span>
                </td>
                <td className={`px-5 py-3.5 text-right font-semibold tabular-nums text-sm ${t.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-600 text-sm">No transactions found</div>
        )}
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map(t => (
          <div key={t.id} className="glass rounded-xl px-4 py-3.5 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{t.description}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.category} · {format(parseISO(t.date), 'MMM d')}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${t.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
              </p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ color: TYPE_CONFIG[t.type]?.color, background: TYPE_CONFIG[t.type]?.bg }}>
                {t.type}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No transactions found</div>
        )}
      </div>
    </div>
  )
}
