import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
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

export default async function TransactionsPage() {
  const { transactions } = await getData()
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">{transactions.length} total</p>
      </div>
      <TransactionsTable transactions={transactions} />
    </div>
  )
}
