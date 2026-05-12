import { listAccounts } from '@/db/queries/accounts'
import { getTransactions } from '@/lib/data'
import { getLivePrices } from '@/lib/prices'
import { getInvestmentHoldings } from '@/lib/transactions'
import { getFireSettings } from '@/db/queries/fire-settings'
import {
  computeAnnualExpenseDefault,
  computeMonthlyContributionDefault,
  computePortfolioTotal,
} from '@/lib/fire'
import { FireDashboard } from './FireDashboard'

export const dynamic = 'force-dynamic'

export default async function FirePage() {
  const [accounts, { transactions }, settings] = await Promise.all([
    listAccounts(),
    getTransactions(),
    getFireSettings(),
  ])

  const needsPrices = accounts.some((a) => a.type === 'brokerage')
  const tickers = needsPrices ? getInvestmentHoldings(transactions).map((h) => h.ticker) : []
  const prices = tickers.length > 0 ? await getLivePrices(tickers) : {}

  const portfolio = computePortfolioTotal(accounts, transactions, prices)
  const annualExpenseDerived = computeAnnualExpenseDefault(transactions)
  const monthlyContributionDerived = computeMonthlyContributionDefault(transactions)

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      <div>
        <h1 className="text-[28px] font-bold text-white tracking-tight">FIRE</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.5)' }}>
          Financial independence projection grounded in your real data.
        </p>
      </div>

      <FireDashboard
        portfolio={portfolio}
        annualExpenseDerived={annualExpenseDerived}
        monthlyContributionDerived={monthlyContributionDerived}
        initialSettings={settings}
      />
    </div>
  )
}
