import Link from 'next/link'
import { Flame, ArrowRight } from 'lucide-react'
import { listAccounts } from '@/db/queries/accounts'
import { getTransactions } from '@/lib/data'
import { getLivePrices } from '@/lib/prices'
import { getInvestmentHoldings } from '@/lib/transactions'
import { getFireSettings } from '@/db/queries/fire-settings'
import {
  computeAnnualExpenseDefault,
  computeMonthlyContributionDefault,
  computeFireNumber,
  computeYearsToFire,
  computeCoastFire,
  computePortfolioTotal,
} from '@/lib/fire'

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function fmtYears(y: number): string {
  if (!Number.isFinite(y)) return '∞ yrs'
  if (y === 0) return 'Already there'
  if (y < 1) return `${Math.round(y * 12)} mo`
  return `${y < 10 ? y.toFixed(1) : Math.round(y)} yrs`
}

export async function FireSummaryCard() {
  const [accounts, { transactions }, settings] = await Promise.all([
    listAccounts(),
    getTransactions(),
    getFireSettings(),
  ])

  const tickers = accounts.some((a) => a.type === 'brokerage')
    ? getInvestmentHoldings(transactions).map((h) => h.ticker)
    : []
  const prices = tickers.length > 0 ? await getLivePrices(tickers) : {}

  const portfolio = computePortfolioTotal(accounts, transactions, prices)
  const annualExpenses = settings.annualExpenseOverride ?? computeAnnualExpenseDefault(transactions)
  const monthlyContribution = settings.monthlyContributionOverride ?? computeMonthlyContributionDefault(transactions)
  const fireNumber = computeFireNumber(annualExpenses, settings.withdrawalRate)
  const { years } = computeYearsToFire(portfolio, monthlyContribution, fireNumber, settings.realReturnRate)
  const coast = computeCoastFire(portfolio, fireNumber, settings.currentAge, settings.targetRetirementAge, settings.realReturnRate)

  const progressPct = fireNumber > 0
    ? Math.max(0, Math.min(100, (portfolio / fireNumber) * 100))
    : 0

  return (
    <Link href="/fire" className="block ios-card p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4" style={{ color: '#ff9f0a' }} />
          <p className="text-[13px] font-semibold text-white">FIRE</p>
          {coast.alreadyCoasting && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'rgba(48,209,88,0.18)', color: '#30d158' }}
            >
              Coasting
            </span>
          )}
        </div>
        <ArrowRight className="h-4 w-4" style={{ color: 'rgba(235,235,245,0.4)' }} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.45)' }}>Portfolio</p>
          <p className="text-[17px] font-semibold text-white tabular-nums">{fmtMoney(portfolio)}</p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.45)' }}>FIRE Number</p>
          <p className="text-[17px] font-semibold tabular-nums" style={{ color: '#0a84ff' }}>
            {fmtMoney(fireNumber)}
          </p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.45)' }}>Years to FIRE</p>
          <p className="text-[17px] font-semibold tabular-nums" style={{ color: '#bf5af2' }}>
            {fmtYears(years)}
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,128,0.2)' }}>
        <div
          className="h-full"
          style={{
            width: `${progressPct}%`,
            background: progressPct >= 100 ? '#30d158' : 'linear-gradient(90deg, #0a84ff, #bf5af2)',
          }}
        />
      </div>
    </Link>
  )
}
