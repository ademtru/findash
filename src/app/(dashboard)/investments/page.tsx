import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { getInvestmentHoldings, filterByMonth, getAvailableMonths } from '@/lib/transactions'
import { getTransactions } from '@/lib/data'
import { getLivePrices } from '@/lib/prices'

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)
  const holdings = getInvestmentHoldings(transactions)
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.cost, 0)

  const monthlyInvested = month
    ? filterByMonth(transactions, month)
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    : null

  const tickers = holdings.map(h => h.ticker)
  const prices = tickers.length > 0 ? await getLivePrices(tickers) : {}

  const holdingsWithValue = holdings.map(h => {
    const price = prices[h.ticker] ?? null
    const currentValue = price !== null ? h.shares * price : null
    const gain = currentValue !== null ? currentValue - h.cost : null
    const gainPct = gain !== null && h.cost > 0 ? (gain / h.cost) * 100 : null
    return { ...h, price, currentValue, gain, gainPct }
  })

  const totalCurrentValue = holdingsWithValue.every(h => h.currentValue !== null)
    ? holdingsWithValue.reduce((sum, h) => sum + (h.currentValue ?? 0), 0)
    : null
  const totalGain = totalCurrentValue !== null ? totalCurrentValue - totalCostBasis : null
  const totalGainPct = totalGain !== null && totalCostBasis > 0
    ? (totalGain / totalCostBasis) * 100
    : null

  const allocationData = holdings.map(h => ({ category: h.ticker, amount: h.cost }))

  const gainLabel = totalGain !== null && totalGainPct !== null
    ? `${totalGain >= 0 ? '+' : ''}$${Math.abs(totalGain).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(1)}%)`
    : '—'

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Investments</h1>
        <RefreshButton />
      </div>

      <MonthSelector months={months} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Cost Basis" value={`$${totalCostBasis.toLocaleString()}`} />
        <StatCard
          title="Current Value"
          value={totalCurrentValue !== null ? `$${totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          accent="cyan"
        />
        <StatCard
          title="Total Gain/Loss"
          value={gainLabel}
          accent={totalGain !== null && totalGain >= 0 ? 'emerald' : undefined}
          trend={totalGain !== null ? (totalGain >= 0 ? 'up' : 'down') : undefined}
        />
        {monthlyInvested !== null
          ? <StatCard title="This Month" value={`$${monthlyInvested.toLocaleString()}`} accent="violet" />
          : <StatCard title="Holdings" value={`${holdings.length}`} />
        }
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SpendingDonut data={allocationData} />
        <HoldingsTable holdings={holdingsWithValue} />
      </div>
    </div>
  )
}
