import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { getInvestmentHoldings, filterByMonth, getAvailableMonths } from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)
  const holdings = getInvestmentHoldings(transactions)
  const totalInvested = holdings.reduce((sum, h) => sum + h.cost, 0)

  const monthlyInvested = month
    ? filterByMonth(transactions, month)
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    : null

  const allocationData = holdings.map(h => ({ category: h.ticker, amount: h.cost }))

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Investments</h1>
        <RefreshButton />
      </div>

      <MonthSelector months={months} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard title="Total Invested" value={`$${totalInvested.toLocaleString()}`} trend="up" />
        <StatCard title="Holdings" value={`${holdings.length}`} />
        {monthlyInvested !== null
          ? <StatCard title="This Month" value={`$${monthlyInvested.toLocaleString()}`} accent="violet" />
          : <StatCard title="Largest Position" value={holdings[0]?.ticker ?? '—'} />
        }
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SpendingDonut data={allocationData} />
        <HoldingsTable holdings={holdings} />
      </div>
    </div>
  )
}
