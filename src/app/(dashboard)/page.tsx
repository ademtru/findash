import { StatCard } from '@/components/dashboard/StatCard'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import {
  getTotalIncome,
  getTotalExpenses,
  getNetWorth,
  getSavingsRate,
  groupByCategory,
  groupByMonth,
} from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function OverviewPage() {
  const { transactions } = await getTransactions()

  const income = getTotalIncome(transactions)
  const expenses = getTotalExpenses(transactions)
  const netWorth = getNetWorth(transactions)
  const savingsRate = getSavingsRate(transactions)

  const byMonth = groupByMonth(transactions)
  const cashFlowData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, txns]) => ({
      month: format(parseISO(`${month}-01`), 'MMM yy'),
      income: getTotalIncome(txns),
      expenses: getTotalExpenses(txns),
    }))

  const expensesByCategory = groupByCategory(transactions.filter(t => t.type === 'expense'))
  const categoryData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Financial snapshot</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Net Worth" value={`$${netWorth.toLocaleString()}`} accent="cyan" />
        <StatCard title="Total Income" value={`$${income.toLocaleString()}`} trend="up" accent="emerald" />
        <StatCard title="Total Expenses" value={`$${expenses.toLocaleString()}`} trend="down" />
        <StatCard title="Savings Rate" value={`${(savingsRate * 100).toFixed(1)}%`} trend={savingsRate > 0.2 ? 'up' : 'neutral'} accent="violet" />
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <CashFlowChart data={cashFlowData} />
        <SpendingDonut data={categoryData} />
      </div>
    </div>
  )
}
