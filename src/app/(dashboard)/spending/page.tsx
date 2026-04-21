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
  const allExpenseMonthCount = Math.max(Object.keys(groupByMonth(allExpenses)).length, 1)

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Spending</h1>
        <RefreshButton />
      </div>

      <MonthSelector months={months} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard title="Total Spent" value={`$${totalSpend.toLocaleString()}`} trend="down" />
        <StatCard title="Top Category" value={categoryData[0]?.category ?? '—'} />
        {!month && (
          <StatCard title="Avg / Month" value={`$${(totalSpend / allExpenseMonthCount).toFixed(0)}`} />
        )}
      </div>

      <div className={month ? 'grid grid-cols-1' : 'grid md:grid-cols-2 gap-4'}>
        <SpendingDonut data={categoryData.slice(0, 6)} month={month} />
        {!month && <SpendingTrends data={trendData} categories={topCategories} />}
      </div>

      {/* Desktop category table */}
      <div className="hidden md:block ios-list">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '0.5px solid rgba(84,84,88,0.4)' }}>
              {['Category', 'Total', '% of Spend'].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${i > 0 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(235,235,245,0.4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categoryData.map(({ category, amount }, i) => {
              const href = `/transactions?${month ? `month=${month}&` : ''}category=${encodeURIComponent(category)}`
              return (
                <tr
                  key={category}
                  style={i < categoryData.length - 1 ? { borderBottom: '0.5px solid rgba(84,84,88,0.2)' } : {}}
                  className="hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium" style={{ color: 'rgba(235,235,245,0.85)' }}>
                    <Link
                      href={href}
                      className="flex items-center gap-1.5 group transition-colors"
                      style={{ color: 'inherit' }}
                    >
                      {category}
                      <span className="opacity-0 group-hover:opacity-50 text-xs transition-opacity">→</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-white">
                    ${amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[13px]"
                    style={{ color: 'rgba(235,235,245,0.5)' }}>
                    {totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {categoryData.length === 0 && (
          <div className="text-center py-12 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No expense data
          </div>
        )}
      </div>

      {/* Mobile category cards */}
      <div className="md:hidden ios-list overflow-hidden">
        {categoryData.map(({ category, amount }, i) => {
          const href = `/transactions?${month ? `month=${month}&` : ''}category=${encodeURIComponent(category)}`
          const pct = totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'
          return (
            <Link
              key={category}
              href={href}
              className="px-4 py-3.5 flex justify-between items-center gap-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              style={i < categoryData.length - 1 ? { borderBottom: '0.5px solid rgba(84,84,88,0.2)', display: 'flex' } : { display: 'flex' }}
            >
              <p className="text-[15px] font-medium text-white truncate">{category}</p>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-semibold tabular-nums text-white">${amount.toFixed(2)}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>{pct}%</p>
              </div>
            </Link>
          )
        })}
        {categoryData.length === 0 && (
          <div className="text-center py-12 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No expense data
          </div>
        )}
      </div>
    </div>
  )
}
