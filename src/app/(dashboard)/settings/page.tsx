import { listAccounts } from '@/db/queries/accounts'
import { getTransactions } from '@/lib/data'
import { getLivePrices } from '@/lib/prices'
import { getInvestmentHoldings } from '@/lib/transactions'
import { computeAccountReconciliation } from '@/lib/fire'
import { AccountsSettings, type EnrichedAccount } from './AccountsSettings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [accounts, { transactions }] = await Promise.all([
    listAccounts(),
    getTransactions(),
  ])

  const needsPrices = accounts.some((a) => a.type === 'brokerage')
  const tickers = needsPrices
    ? getInvestmentHoldings(transactions).map((h) => h.ticker)
    : []
  const prices = tickers.length > 0 ? await getLivePrices(tickers) : {}

  const enriched: EnrichedAccount[] = accounts.map((a) => {
    const r = computeAccountReconciliation(a, transactions, prices)
    const txnCount = transactions.filter(
      (t) => t.account === a.name && t.date >= a.startingDate,
    ).length
    return { ...a, ...r, txnCount }
  })

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-white tracking-tight">Settings</h1>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-[17px] font-semibold text-white">My Accounts</h2>
          <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.5)' }}>
            Track balances and reconcile against your transaction history.
          </p>
        </div>
        <AccountsSettings initial={enriched} />
      </section>
    </div>
  )
}
