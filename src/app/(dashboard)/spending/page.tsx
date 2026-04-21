import Link from 'next/link'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { SpendingTrends } from '@/components/dashboard/SpendingTrends'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { groupByCategory, groupByMonth, getTotalExpenses, filterByMonth, getAvailableMonths } from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)
  const filtered = filterByMonth(transactions, month)
  const expenses = filtered.filter(t => t.type === 'expense')

  const byCategory = groupByCategory(expenses)
  const categoryData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topCategories = categoryData.slice(0, 5).map(c => c.category)

  // Trend chart needs multiple months — only show in all-time view
  const allExpenses = transactions.filter(t => t.type === 'expense')
  const trendData = month ? [] : Object.entries(groupByMonth(allExpenses))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, txns]) => {
      const byCat = groupByCategory(txns)
      return {
        month: format(parseISO(`${m}-01`), 'MMM yy'),
        ...Object.fromEntries(topCategories.map(cat => [cat, byCat[cat] ?? 0])),
      }
    })

  const totalSpend = getTotalExpenses(expenses)
  const allExpenseMonthCount = Math.max(
    Object.keys(groupByMonth(allExpenses)).length,
    1
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Spending</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Breakdown by category and time</p>
        </div>
        <RefreshButton />
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Spent" value={`$${totalSpend.toLocaleString()}`} trend="down" />
        <StatCard title="Top Category" value={categoryData[0]?.category ?? '—'} />
        {!month && (
          <StatCard title="Avg / Month" value={`$${(totalSpend / allExpenseMonthCount).toFixed(0)}`} />
        )}
      </div>
      <div className={month ? 'grid grid-cols-1' : 'grid md:grid-cols-2 gap-4 md:gap-6'}>
        <SpendingDonut data={categoryData.slice(0, 6)} month={month} />
        {!month && <SpendingTrends data={trendData} categories={topCategories} />}
      </div>
      {/* Desktop category table */}
      <div className="hidden md:block glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Total</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">% of Spend</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(({ category, amount }, i) => {
              const href = `/transactions?${month ? `month=${month}&` : ''}category=${encodeURIComponent(category)}`
              return (
                <tr key={category} className={`border-b border-white/[0.03] transition-colors ${i === categoryData.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-300">
                    <Link href={href} className="hover:text-cyan-400 transition-colors flex items-center gap-1 group">
                      {category}
                      <span className="opacity-0 group-hover:opacity-60 text-xs transition-opacity">→</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-white font-medium">${amount.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
                    {totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {categoryData.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No expense data</div>
        )}
      </div>

      {/* Mobile category cards */}
      <div className="md:hidden space-y-2">
        {categoryData.map(({ category, amount }) => {
          const href = `/transactions?${month ? `month=${month}&` : ''}category=${encodeURIComponent(category)}`
          const pct = totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'
          return (
            <Link key={category} href={href} className="glass rounded-xl px-4 py-3.5 flex justify-between items-center gap-3 hover:border-white/15 transition-colors block">
              <p className="text-sm font-medium text-slate-200 truncate">{category}</p>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums text-white">${amount.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{pct}%</p>
              </div>
            </Link>
          )
        })}
        {categoryData.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No expense data</div>
        )}
      </div>
    </div>
  )
}
