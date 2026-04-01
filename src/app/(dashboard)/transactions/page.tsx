import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { CategoryFilter } from '@/components/dashboard/CategoryFilter'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import {
  filterByMonth,
  filterByCategory,
  filterByType,
  getTotalIncome,
  getTotalExpenses,
  getAvailableMonths,
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

  // Filter chain: month → category → type
  const byMonth = filterByMonth(transactions, month)
  // Derive category list from month-filtered transactions (before category filter)
  const categories = Array.from(new Set(
    byMonth.filter(t => t.type === 'expense').map(t => t.category)
  )).sort()
  const byCategory = filterByCategory(byMonth, category)
  const filtered = filterByType(byCategory, type)

  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
            {month || category
              ? `${filtered.length} transactions · +$${income.toLocaleString()} · -$${expenses.toLocaleString()}${category ? ` · ${category}` : ''}`
              : `${transactions.length} transactions total`}
          </p>
        </div>
        <RefreshButton />
      </div>
      <MonthSelector months={months} />
      <CategoryFilter categories={categories} selectedCategory={category} />
      <TransactionsTable transactions={filtered} selectedType={type} />
    </div>
  )
}
