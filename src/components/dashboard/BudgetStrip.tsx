import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  currentMonthKey,
  getMonthSpendByCategory,
  monthProgress,
  paceStatus,
  resolveCapCents,
  type BudgetRecord,
} from '@/lib/budgets'
import type { Transaction } from '@/types/transaction'

interface Row {
  category: string
  spent: number
  capDollars: number
  percentUsed: number
  status: 'over' | 'on-track' | 'under'
}

export function BudgetStrip({
  budgets,
  transactions,
  month = currentMonthKey(),
}: {
  budgets: BudgetRecord[]
  transactions: Transaction[]
  month?: string
}) {
  const withCaps = Array.from(
    new Set(budgets.filter((b) => b.month === month || b.month === null).map((b) => b.category)),
  )
  if (withCaps.length === 0) {
    return (
      <div className="ios-card p-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-white">No budgets yet</p>
          <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.5)' }}>
            Set monthly caps to see pace tracking here.
          </p>
        </div>
        <Link
          href="/budgets"
          className="text-[13px] font-medium"
          style={{ color: '#0a84ff' }}
        >
          Set up →
        </Link>
      </div>
    )
  }

  const spendMap = getMonthSpendByCategory(transactions, month)
  const progress = monthProgress(month)

  const rows: Row[] = withCaps
    .map<Row | null>((category) => {
      const cap = resolveCapCents(budgets, category, month)
      if (cap === null) return null
      const spent = spendMap.get(category) ?? 0
      const pace = paceStatus({ spent, capCents: cap, fraction: progress.fraction })
      return {
        category,
        spent,
        capDollars: cap / 100,
        percentUsed: pace.percentUsed,
        status: pace.status,
      }
    })
    .filter((r): r is Row => r !== null)
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 3)

  const totalCap = withCaps.reduce((sum, c) => {
    const cap = resolveCapCents(budgets, c, month)
    return sum + (cap ?? 0) / 100
  }, 0)
  const totalSpent = withCaps.reduce((sum, c) => sum + (spendMap.get(c) ?? 0), 0)
  const overallPercent = totalCap <= 0 ? 0 : Math.min(2, totalSpent / totalCap)
  const overallColor =
    overallPercent >= 1 ? '#ff453a' :
    overallPercent > progress.fraction + 0.2 ? '#ff9f0a' :
    '#30d158'

  return (
    <Link href="/budgets" className="ios-card p-4 block">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(235,235,245,0.45)' }}
          >
            Budget · {month}
          </p>
          <p className="text-[17px] font-semibold text-white mt-0.5">
            ${totalSpent.toFixed(0)}
            <span className="text-[13px] font-normal ml-1" style={{ color: 'rgba(235,235,245,0.5)' }}>
              / ${totalCap.toFixed(0)}
            </span>
          </p>
        </div>
        <ChevronRight className="h-4 w-4" style={{ color: 'rgba(235,235,245,0.4)' }} />
      </div>

      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(120,120,128,0.2)' }}>
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(100, overallPercent * 100)}%`, background: overallColor }}
        />
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.category} className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-white truncate flex-1">{r.category}</span>
            <span
              className="text-[12px] tabular-nums shrink-0"
              style={{
                color:
                  r.status === 'over' ? '#ff453a' :
                  r.status === 'under' ? '#30d158' :
                  'rgba(235,235,245,0.65)',
              }}
            >
              ${r.spent.toFixed(0)} / ${r.capDollars.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </Link>
  )
}
