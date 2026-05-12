import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { MobileSettingsLink } from '@/components/dashboard/MobileSettingsLink'
import { StatCard } from '@/components/dashboard/StatCard'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { BudgetStrip } from '@/components/dashboard/BudgetStrip'
import { FireSummaryCard } from '@/components/dashboard/FireSummaryCard'
import { AccountsCard } from '@/components/dashboard/AccountsCard'
import {
  getTotalIncome, getTotalExpenses, getNetWorth,
  getSavingsRate, groupByCategory, groupByMonth, filterByMonth, getAvailableMonths,
} from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'
import { listAllBudgets } from '@/db/queries/budgets'
import { currentMonthKey } from '@/lib/budgets'

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const [{ transactions }, budgets] = await Promise.all([
    getTransactions(),
    listAllBudgets(),
  ])

  const months = getAvailableMonths(transactions)
  const filtered = filterByMonth(transactions, month)

  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)
  const savingsRate = getSavingsRate(filtered)

  const primaryValue = month
    ? `$${(income - expenses).toLocaleString()}`
    : `$${getNetWorth(transactions).toLocaleString()}`
  const primaryTitle = month ? 'Net Cash Flow' : 'Net Worth'

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
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Overview</h1>
        <div className="flex items-center gap-2">
          <MobileSettingsLink />
          <RefreshButton />
        </div>
      </div>

      <MonthSelector months={months} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={primaryTitle} value={primaryValue} accent="cyan" />
        <StatCard title="Total Income" value={`$${income.toLocaleString()}`} trend="up" accent="emerald" />
        <StatCard title="Total Expenses" value={`$${expenses.toLocaleString()}`} trend="down" />
        <StatCard
          title="Savings Rate"
          value={`${(savingsRate * 100).toFixed(1)}%`}
          trend={savingsRate > 0.2 ? 'up' : 'neutral'}
          accent="violet"
        />
      </div>

      <BudgetStrip
        budgets={budgets}
        transactions={transactions}
        month={month ?? currentMonthKey()}
      />

      {!month && (
        <div className="grid md:grid-cols-2 gap-4">
          <FireSummaryCard />
          <AccountsCard />
        </div>
      )}

      <div className={month ? 'grid grid-cols-1' : 'grid md:grid-cols-2 gap-4'}>
        {!month && <CashFlowChart data={cashFlowData} />}
        <SpendingDonut data={categoryData} />
      </div>
    </div>
  )
}
