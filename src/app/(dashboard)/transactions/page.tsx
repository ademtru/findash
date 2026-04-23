import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { CategoryFilter } from '@/components/dashboard/CategoryFilter'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import {
  filterByMonth, filterByCategory, filterByType,
  getTotalIncome, getTotalExpenses, getAvailableMonths,
} from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; type?: string }>
}) {
  const { month, category, type } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)
  const byMonth = filterByMonth(transactions, month)
  const categories = Array.from(new Set(
    byMonth.filter(t => t.type === 'expense').map(t => t.category),
  )).sort()
  const byCategory = filterByCategory(byMonth, category)
  const filtered = filterByType(byCategory, type)

  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)
  const net = income - expenses

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
            {filtered.length} of {transactions.length} transactions
            {category ? ` · ${category}` : ''}
          </p>
        </div>
        <RefreshButton />
      </div>
      <MonthSelector months={months} />
      <CategoryFilter categories={categories} selectedCategory={category} />

      <div className="grid grid-cols-3 gap-2">
        <TotalCell label="Income" value={income} tone="positive" />
        <TotalCell label="Expenses" value={expenses} tone="negative" />
        <TotalCell label="Net" value={net} tone={net >= 0 ? 'positive' : 'negative'} signed />
      </div>

      <TransactionsTable transactions={filtered} selectedType={type} />
    </div>
  )
}

function TotalCell({
  label,
  value,
  tone,
  signed,
}: {
  label: string
  value: number
  tone: 'positive' | 'negative'
  signed?: boolean
}) {
  const color = tone === 'positive' ? '#30d158' : '#ff453a'
  const sign = signed ? (value >= 0 ? '+' : '−') : ''
  const displayValue = Math.abs(value)
  return (
    <div className="ios-card px-3 py-2.5">
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'rgba(235,235,245,0.45)' }}
      >
        {label}
      </p>
      <p
        className="text-[18px] md:text-[20px] font-semibold tabular-nums mt-0.5"
        style={{ color }}
      >
        {sign}${displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  )
}
