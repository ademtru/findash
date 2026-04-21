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

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
            {month || category
              ? `${filtered.length} transactions · +$${income.toLocaleString()} · −$${expenses.toLocaleString()}${category ? ` · ${category}` : ''}`
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
