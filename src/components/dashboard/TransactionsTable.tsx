'use client'
import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { Transaction } from '@/types/transaction'

const TYPE_COLORS: Record<string, string> = {
  income: 'bg-emerald-400/10 text-emerald-400',
  expense: 'bg-red-400/10 text-red-400',
  investment: 'bg-violet-400/10 text-violet-400',
  transfer: 'bg-blue-400/10 text-blue-400',
}

const TYPES = ['all', 'income', 'expense', 'investment', 'transfer']

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    return transactions
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t =>
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, search, typeFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                typeFilter === type
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">{format(parseISO(t.date), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 font-medium">{t.description}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{t.category}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[t.type] ?? ''}`}>
                    {t.type}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${t.amount >= 0 ? 'text-emerald-400' : 'text-foreground'}`}>
                  {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {filtered.map(t => (
          <Card key={t.id} className="bg-card/50 border-border/50">
            <CardContent className="py-3 px-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.category} · {format(parseISO(t.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-sm tabular-nums ${t.amount >= 0 ? 'text-emerald-400' : ''}`}>
                    {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${TYPE_COLORS[t.type] ?? ''}`}>
                    {t.type}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No transactions found</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
