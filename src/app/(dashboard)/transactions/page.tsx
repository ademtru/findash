import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { filterByMonth, getTotalIncome, getTotalExpenses, getAvailableMonths } from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function TransactionsPage({
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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
          {month
            ? `${filtered.length} transactions · +$${income.toLocaleString()} · -$${expenses.toLocaleString()}`
            : `${transactions.length} transactions total`}
        </p>
      </div>
      <MonthSelector months={months} />
      <TransactionsTable transactions={filtered} />
    </div>
  )
}
