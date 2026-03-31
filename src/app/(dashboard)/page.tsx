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
import type { TransactionData } from '@/types/transaction'

async function getData(): Promise<TransactionData> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/transactions`, { cache: 'no-store' })
    return res.json()
  } catch {
    return { transactions: [] }
  }
}

export default async function OverviewPage() {
  const { transactions } = await getData()

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
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Your financial snapshot</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Net Worth" value={`$${netWorth.toLocaleString()}`} />
        <StatCard title="Total Income" value={`$${income.toLocaleString()}`} trend="up" />
        <StatCard title="Total Expenses" value={`$${expenses.toLocaleString()}`} trend="down" />
        <StatCard title="Savings Rate" value={`${(savingsRate * 100).toFixed(1)}%`} trend={savingsRate > 0.2 ? 'up' : 'neutral'} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <CashFlowChart data={cashFlowData} />
        <SpendingDonut data={categoryData} />
      </div>
    </div>
  )
}
