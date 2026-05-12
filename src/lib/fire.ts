import type { AccountRow } from '@/db/schema'
import type { Transaction } from '@/types/transaction'
import { getInvestmentHoldings } from '@/lib/transactions'

export interface FireSettings {
  withdrawalRate: number
  realReturnRate: number
  currentAge: number
  targetRetirementAge: number
  annualExpenseOverride: number | null
  monthlyContributionOverride: number | null
}

export const DEFAULT_FIRE_SETTINGS: FireSettings = {
  withdrawalRate: 0.04,
  realReturnRate: 0.07,
  currentAge: 30,
  targetRetirementAge: 50,
  annualExpenseOverride: null,
  monthlyContributionOverride: null,
}

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

/**
 * Average monthly expenses across the last `months` full months, × 12.
 * "Full" means we drop the current month (it's incomplete).
 */
export function computeAnnualExpenseDefault(transactions: Transaction[], months = 3): number {
  const now = new Date()
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const past: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const key = t.date.slice(0, 7)
    if (key >= currentMonthKey) continue
    past[key] = (past[key] ?? 0) + Math.abs(t.amount)
  }
  const keys = Object.keys(past).sort().slice(-months)
  if (keys.length === 0) return 0
  const totalMonthly = keys.reduce((s, k) => s + past[k], 0) / keys.length
  return totalMonthly * 12
}

/**
 * Average monthly investment outflows across the last `months` full months.
 */
export function computeMonthlyContributionDefault(transactions: Transaction[], months = 3): number {
  const now = new Date()
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const past: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type !== 'investment') continue
    if (t.amount >= 0) continue // only outflows count as contributions
    const key = t.date.slice(0, 7)
    if (key >= currentMonthKey) continue
    past[key] = (past[key] ?? 0) + Math.abs(t.amount)
  }
  const keys = Object.keys(past).sort().slice(-months)
  if (keys.length === 0) return 0
  return keys.reduce((s, k) => s + past[k], 0) / keys.length
}

export function computeFireNumber(annualExpenses: number, withdrawalRate: number): number {
  if (withdrawalRate <= 0) return Infinity
  return annualExpenses / withdrawalRate
}

export interface YearsToFireResult {
  years: number // Infinity if unreachable within MAX_YEARS
  monthlySeries: { month: number; value: number }[]
  reachedAtMonth: number | null
}

const MAX_PROJECTION_YEARS = 60

/**
 * Project portfolio month-by-month with monthly contributions and monthly compounding.
 * Returns the month index when fireNumber is reached, or Infinity if it isn't within MAX_PROJECTION_YEARS.
 */
export function computeYearsToFire(
  portfolio: number,
  monthlyContribution: number,
  fireNumber: number,
  realReturnRate: number,
): YearsToFireResult {
  const monthlyRate = realReturnRate / 12
  const maxMonths = MAX_PROJECTION_YEARS * 12
  const series: { month: number; value: number }[] = [{ month: 0, value: portfolio }]
  let value = portfolio
  let reachedAtMonth: number | null = value >= fireNumber ? 0 : null

  for (let m = 1; m <= maxMonths; m++) {
    value = value * (1 + monthlyRate) + monthlyContribution
    series.push({ month: m, value })
    if (reachedAtMonth === null && value >= fireNumber) {
      reachedAtMonth = m
    }
    if (reachedAtMonth !== null && m >= reachedAtMonth + 12) break
  }

  return {
    years: reachedAtMonth === null ? Infinity : reachedAtMonth / 12,
    monthlySeries: series,
    reachedAtMonth,
  }
}

export interface CoastFireResult {
  coastNumberToday: number
  alreadyCoasting: boolean
  coastAge: number // age at which, if you stop contributing now, you'd reach FIRE
  projectedAtTargetAge: number // portfolio value at targetRetirementAge with zero further contributions
}

export function computeCoastFire(
  portfolio: number,
  fireNumber: number,
  currentAge: number,
  targetRetirementAge: number,
  realReturnRate: number,
): CoastFireResult {
  const years = Math.max(0, targetRetirementAge - currentAge)
  const growth = (1 + realReturnRate) ** years
  const coastNumberToday = fireNumber / growth
  const projectedAtTargetAge = portfolio * growth
  const alreadyCoasting = portfolio >= coastNumberToday

  let coastAge: number
  if (portfolio <= 0 || realReturnRate <= 0) {
    coastAge = Infinity
  } else if (alreadyCoasting) {
    coastAge = currentAge + Math.log(fireNumber / portfolio) / Math.log(1 + realReturnRate)
  } else {
    coastAge = currentAge + Math.log(fireNumber / portfolio) / Math.log(1 + realReturnRate)
  }

  return { coastNumberToday, alreadyCoasting, coastAge, projectedAtTargetAge }
}
