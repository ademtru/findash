import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { getTransactions } from '@/lib/data'

export default async function TransactionsPage() {
  const { transactions } = await getTransactions()
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{transactions.length} records</p>
      </div>
      <TransactionsTable transactions={transactions} />
    </div>
  )
}
