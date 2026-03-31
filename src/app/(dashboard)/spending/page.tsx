import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { SpendingTrends } from '@/components/dashboard/SpendingTrends'
import { StatCard } from '@/components/dashboard/StatCard'
import { groupByCategory, groupByMonth, getTotalExpenses } from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function SpendingPage() {
  const { transactions } = await getTransactions()
  const expenses = transactions.filter(t => t.type === 'expense')

  const byCategory = groupByCategory(expenses)
  const categoryData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topCategories = categoryData.slice(0, 5).map(c => c.category)

  const byMonth = groupByMonth(expenses)
  const trendData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, txns]) => {
      const byCat = groupByCategory(txns)
      return {
        month: format(parseISO(`${month}-01`), 'MMM yy'),
        ...Object.fromEntries(topCategories.map(cat => [cat, byCat[cat] ?? 0])),
      }
    })

  const totalSpend = getTotalExpenses(expenses)
  const monthCount = Math.max(Object.keys(byMonth).length, 1)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Spending</h1>
        <p className="text-sm text-muted-foreground mt-1">Breakdown by category and time</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Spent" value={`$${totalSpend.toLocaleString()}`} trend="down" />
        <StatCard title="Top Category" value={categoryData[0]?.category ?? '—'} />
        <StatCard title="Avg / Month" value={`$${(totalSpend / monthCount).toFixed(0)}`} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <SpendingDonut data={categoryData.slice(0, 6)} />
        <SpendingTrends data={trendData} categories={topCategories} />
      </div>
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">% of Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {categoryData.map(({ category, amount }) => (
              <tr key={category} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{category}</td>
                <td className="px-4 py-3 text-right tabular-nums">${amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
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
