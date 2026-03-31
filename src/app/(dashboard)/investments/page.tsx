import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { StatCard } from '@/components/dashboard/StatCard'
import { getInvestmentHoldings } from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function InvestmentsPage() {
  const { transactions } = await getTransactions()
  const holdings = getInvestmentHoldings(transactions)
  const totalInvested = holdings.reduce((sum, h) => sum + h.cost, 0)

  const allocationData = holdings.map(h => ({
    category: h.ticker,
    amount: h.cost,
  }))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Investments</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Portfolio holdings and allocation</p>
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
