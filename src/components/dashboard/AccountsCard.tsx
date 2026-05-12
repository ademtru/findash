import Link from 'next/link'
import { Wallet, ArrowRight, AlertTriangle } from 'lucide-react'
import { listAccounts } from '@/db/queries/accounts'
import { getTransactions } from '@/lib/data'
import { getLivePrices } from '@/lib/prices'
import { getInvestmentHoldings } from '@/lib/transactions'
import { computeAccountReconciliation } from '@/lib/fire'
import type { AccountType } from '@/db/schema'

const TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  brokerage: 'Brokerage',
  credit: 'Credit',
  loan: 'Loan',
}

const TYPE_COLORS: Record<AccountType, string> = {
  cash: 'rgba(48,209,88,0.18)',
  brokerage: 'rgba(10,132,255,0.18)',
  credit: 'rgba(255,159,10,0.18)',
  loan: 'rgba(255,69,58,0.18)',
}

const TYPE_TEXT_COLORS: Record<AccountType, string> = {
  cash: '#30d158',
  brokerage: '#0a84ff',
  credit: '#ff9f0a',
  loan: '#ff453a',
}

function fmtMoney(n: number): string {
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export async function AccountsCard() {
  const [accounts, { transactions }] = await Promise.all([
    listAccounts(),
    getTransactions(),
  ])

  if (accounts.length === 0) {
    return (
      <Link href="/settings" className="block ios-card p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" style={{ color: '#0a84ff' }} />
            <p className="text-[13px] font-semibold text-white">Accounts</p>
          </div>
          <ArrowRight className="h-4 w-4" style={{ color: 'rgba(235,235,245,0.4)' }} />
        </div>
        <p className="text-[13px]" style={{ color: 'rgba(235,235,245,0.5)' }}>
          Add accounts in Settings to track balances and reconcile against transactions.
        </p>
      </Link>
    )
  }

  const tickers = accounts.some((a) => a.type === 'brokerage')
    ? getInvestmentHoldings(transactions).map((h) => h.ticker)
    : []
  const prices = tickers.length > 0 ? await getLivePrices(tickers) : {}

  const rows = accounts.map((account) => {
    const r = computeAccountReconciliation(account, transactions, prices)
    const balance = r.snapshot ?? r.derived
    const hasDiff = r.diff !== null && Math.abs(r.diff) > 0.01
    return { account, balance, hasDiff }
  })

  const netWorth = rows.reduce((sum, { account, balance }) => {
    return account.type === 'credit' || account.type === 'loan'
      ? sum - balance
      : sum + balance
  }, 0)

  return (
    <Link href="/settings" className="block ios-card p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4" style={{ color: '#0a84ff' }} />
          <p className="text-[13px] font-semibold text-white">Accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] tabular-nums font-semibold" style={{ color: '#0a84ff' }}>
            {fmtMoney(netWorth)}
          </span>
          <ArrowRight className="h-4 w-4" style={{ color: 'rgba(235,235,245,0.4)' }} />
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(({ account, balance, hasDiff }) => {
          const type = (account.type as AccountType) ?? 'cash'
          const isLiability = type === 'credit' || type === 'loan'
          return (
            <div key={account.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                  style={{ background: TYPE_COLORS[type], color: TYPE_TEXT_COLORS[type] }}
                >
                  {TYPE_LABELS[type]}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{account.name}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
                    ••••{account.last4}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {hasDiff && (
                  <AlertTriangle
                    className="h-3 w-3"
                    style={{ color: '#ff9f0a' }}
                    aria-label="Balance differs from transactions"
                  />
                )}
                <span
                  className="text-[14px] font-semibold tabular-nums"
                  style={{ color: isLiability ? '#ff9f0a' : 'white' }}
                >
                  {isLiability ? '−' : ''}{fmtMoney(balance).replace(/^−/, '')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Link>
  )
}
