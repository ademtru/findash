import type { AccountRow } from '@/db/schema'
import type { Transaction } from '@/types/transaction'
import { getInvestmentHoldings } from '@/lib/transactions'

export type PriceMap = Record<string, number | null>

export interface ReconciliationResult {
  derived: number
  snapshot: number | null
  diff: number | null
  snapshotAt: Date | null
}

/**
 * Sum of transactions for this account since its starting date.
 * For brokerage accounts, also adds the market value of holdings transacted under it.
 */
export function computeDerivedBalance(
  account: AccountRow,
  transactions: Transaction[],
  prices: PriceMap = {},
): number {
  const starting = Number(account.startingBalance)
  const startDate = account.startingDate

  const ownTxns = transactions.filter(
    (t) => t.account === account.name && t.date >= startDate,
  )

  const cashFlow = ownTxns.reduce((sum, t) => sum + t.amount, 0)

  let marketValue = 0
  if (account.type === 'brokerage') {
    const holdings = getInvestmentHoldings(ownTxns)
    for (const h of holdings) {
      const px = prices[h.ticker]
      if (typeof px === 'number') marketValue += h.shares * px
    }
  }

  return starting + cashFlow + marketValue
}

export function computeAccountReconciliation(
  account: AccountRow,
  transactions: Transaction[],
  prices: PriceMap = {},
): ReconciliationResult {
  const derived = computeDerivedBalance(account, transactions, prices)
  const snapshot = account.balanceSnapshot === null ? null : Number(account.balanceSnapshot)
  const diff = snapshot === null ? null : snapshot - derived
  return { derived, snapshot, diff, snapshotAt: account.snapshotAt ?? null }
}

/**
 * Total portfolio for FIRE math.
 *   assets (cash + brokerage) − liabilities (credit + loan).
 * Prefers the manual snapshot when present, else uses the derived balance.
 */
export function computePortfolioTotal(
  accounts: AccountRow[],
  transactions: Transaction[],
  prices: PriceMap = {},
): number {
  let total = 0
  for (const account of accounts) {
    const recon = computeAccountReconciliation(account, transactions, prices)
    const value = recon.snapshot ?? recon.derived
    if (account.type === 'credit' || account.type === 'loan') {
      total -= value
    } else {
      total += value
    }
  }
  return total
}
