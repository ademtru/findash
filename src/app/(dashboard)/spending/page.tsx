import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { SpendingTrends } from '@/components/dashboard/SpendingTrends'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { groupByCategory, groupByMonth, getTotalExpenses, filterByMonth } from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  const filtered = filterByMonth(transactions, month)
  const expenses = filtered.filter(t => t.type === 'expense')

  const byCategory = groupByCategory(expenses)
  const categoryData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topCategories = categoryData.slice(0, 5).map(c => c.category)

  const byMonth = groupByMonth(expenses)
  const trendData = Object.entries(byMonth)
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
    Object.keys(groupByMonth(transactions.filter(t => t.type === 'expense'))).length,
    1
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Spending</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Breakdown by category and time</p>
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Spent" value={`$${totalSpend.toLocaleString()}`} trend="down" />
        <StatCard title="Top Category" value={categoryData[0]?.category ?? '—'} />
        {!month && (
          <StatCard title="Avg / Month" value={`$${(totalSpend / allExpenseMonthCount).toFixed(0)}`} />
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <SpendingDonut data={categoryData.slice(0, 6)} />
        <SpendingTrends data={trendData} categories={topCategories} />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Total</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">% of Spend</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(({ category, amount }, i) => (
              <tr key={category} className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i === categoryData.length - 1 ? 'border-0' : ''}`}>
                <td className="px-5 py-3.5 font-medium text-slate-300">{category}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-white font-medium">${amount.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
                  {totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
