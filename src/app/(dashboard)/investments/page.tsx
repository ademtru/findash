import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { StatCard } from '@/components/dashboard/StatCard'
import { getInvestmentHoldings } from '@/lib/transactions'
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

export default async function InvestmentsPage() {
  const { transactions } = await getData()
  const holdings = getInvestmentHoldings(transactions)
  const totalInvested = holdings.reduce((sum, h) => sum + h.cost, 0)

  const allocationData = holdings.map(h => ({
    category: h.ticker,
    amount: h.cost,
  }))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
        <p className="text-sm text-muted-foreground mt-1">Portfolio holdings and allocation</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Invested" value={`$${totalInvested.toLocaleString()}`} trend="up" />
        <StatCard title="Holdings" value={`${holdings.length}`} />
        <StatCard title="Largest Position" value={holdings[0]?.ticker ?? '—'} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <SpendingDonut data={allocationData} />
        <div className="flex flex-col justify-start">
          <HoldingsTable holdings={holdings} />
        </div>
      </div>
    </div>
  )
}
