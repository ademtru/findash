import { StatCard } from '@/components/dashboard/StatCard'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import {
  getTotalIncome, getTotalExpenses, getNetWorth,
  getSavingsRate, groupByCategory, groupByMonth, filterByMonth, getAvailableMonths,
} from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)
  const filtered = filterByMonth(transactions, month)

  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)
  const savingsRate = getSavingsRate(filtered)

  const primaryValue = month
    ? `$${(income - expenses).toLocaleString()}`
    : `$${getNetWorth(transactions).toLocaleString()}`
  const primaryTitle = month ? 'Net Cash Flow' : 'Net Worth'

  // Only show the 6-month cash flow chart in all-time view — single bar is meaningless
  const cashFlowData = month ? [] : Object.entries(groupByMonth(transactions))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, txns]) => ({
      month: format(parseISO(`${m}-01`), 'MMM yy'),
      income: getTotalIncome(txns),
      expenses: getTotalExpenses(txns),
    }))

  const categoryData = Object.entries(groupByCategory(filtered.filter(t => t.type === 'expense')))
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Financial snapshot</p>
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title={primaryTitle} value={primaryValue} accent="cyan" />
        <StatCard title="Total Income" value={`$${income.toLocaleString()}`} trend="up" accent="emerald" />
        <StatCard title="Total Expenses" value={`$${expenses.toLocaleString()}`} trend="down" />
        <StatCard title="Savings Rate" value={`${(savingsRate * 100).toFixed(1)}%`} trend={savingsRate > 0.2 ? 'up' : 'neutral'} accent="violet" />
      </div>
      <div className={month ? 'grid grid-cols-1' : 'grid md:grid-cols-2 gap-4 md:gap-6'}>
        {!month && <CashFlowChart data={cashFlowData} />}
        <SpendingDonut data={categoryData} />
      </div>
    </div>
  )
}
