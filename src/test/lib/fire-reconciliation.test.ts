import { describe, it, expect } from 'vitest'
import {
  computeDerivedBalance,
  computeAccountReconciliation,
  computePortfolioTotal,
  type PriceMap,
} from '@/lib/fire'
import type { AccountRow } from '@/db/schema'
import type { Transaction } from '@/types/transaction'

function makeAccount(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: overrides.id ?? 'acc-1',
    name: overrides.name ?? 'Checking',
    institution: overrides.institution ?? null,
    last4: overrides.last4 ?? '1234',
    type: overrides.type ?? 'cash',
    startingBalance: overrides.startingBalance ?? '0',
    startingDate: overrides.startingDate ?? '1970-01-01',
    balanceSnapshot: overrides.balanceSnapshot ?? null,
    snapshotAt: overrides.snapshotAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
  }
}

const txns: Transaction[] = [
  { id: '1', date: '2025-03-01', amount: 5000, type: 'income', category: 'Salary', description: 'Salary', account: 'Checking' },
  { id: '2', date: '2025-03-10', amount: -200, type: 'expense', category: 'Food', description: 'Groceries', account: 'Checking' },
  { id: '3', date: '2025-02-15', amount: -100, type: 'expense', category: 'Food', description: 'Old', account: 'Checking' },
  { id: '4', date: '2025-03-15', amount: -1000, type: 'investment', category: 'Investment', description: 'Buy AAPL', account: 'Brokerage', ticker: 'AAPL', shares: 5, price_per_share: 200 },
  { id: '5', date: '2025-03-20', amount: -50, type: 'expense', category: 'Food', description: 'OtherAccount', account: 'Savings' },
]

describe('computeDerivedBalance', () => {
  it('sums starting balance + transactions for cash account', () => {
    const acc = makeAccount({ name: 'Checking', startingBalance: '1000', startingDate: '1970-01-01' })
    // 1000 + (5000 - 200 - 100) = 5700
    expect(computeDerivedBalance(acc, txns)).toBe(5700)
  })

  it('filters out transactions before starting date', () => {
    const acc = makeAccount({ name: 'Checking', startingBalance: '100', startingDate: '2025-03-01' })
    // Excludes the 2025-02-15 txn. 100 + (5000 - 200) = 4900
    expect(computeDerivedBalance(acc, txns)).toBe(4900)
  })

  it('ignores transactions for other accounts', () => {
    const acc = makeAccount({ name: 'Savings', startingBalance: '0' })
    expect(computeDerivedBalance(acc, txns)).toBe(-50)
  })

  it('adds market value for brokerage accounts', () => {
    const acc = makeAccount({ name: 'Brokerage', type: 'brokerage', startingBalance: '0' })
    const prices: PriceMap = { AAPL: 250 }
    // cashFlow = -1000 (the investment purchase outflow), market = 5 * 250 = 1250 → net 250
    expect(computeDerivedBalance(acc, txns, prices)).toBe(250)
  })

  it('falls back to 0 market value when no price is provided', () => {
    const acc = makeAccount({ name: 'Brokerage', type: 'brokerage' })
    expect(computeDerivedBalance(acc, txns, {})).toBe(-1000)
  })
})

describe('computeAccountReconciliation', () => {
  it('returns null diff when no snapshot', () => {
    const acc = makeAccount({ name: 'Checking', startingBalance: '0' })
    const r = computeAccountReconciliation(acc, txns)
    expect(r.snapshot).toBeNull()
    expect(r.diff).toBeNull()
    expect(r.derived).toBe(4700)
  })

  it('computes diff = snapshot − derived', () => {
    const acc = makeAccount({
      name: 'Checking',
      startingBalance: '0',
      balanceSnapshot: '4750',
      snapshotAt: new Date('2025-03-20'),
    })
    const r = computeAccountReconciliation(acc, txns)
    expect(r.derived).toBe(4700)
    expect(r.snapshot).toBe(4750)
    expect(r.diff).toBe(50)
    expect(r.snapshotAt).toEqual(new Date('2025-03-20'))
  })
})

describe('computePortfolioTotal', () => {
  it('sums cash + brokerage, subtracts credit/loan', () => {
    const cash = makeAccount({ id: 'a1', name: 'Checking', type: 'cash', startingBalance: '1000' })
    const brokerage = makeAccount({ id: 'a2', name: 'Brokerage', type: 'brokerage', startingBalance: '0' })
    const credit = makeAccount({ id: 'a3', name: 'Credit', type: 'credit', startingBalance: '500' })
    const prices: PriceMap = { AAPL: 250 }
    // cash derived = 1000 + 4700 = 5700
    // brokerage derived = 0 + (-1000) + (5*250) = 250
    // credit derived = 500 (positive starting; treated as owed)
    // total = 5700 + 250 - 500 = 5450
    expect(computePortfolioTotal([cash, brokerage, credit], txns, prices)).toBe(5450)
  })

  it('prefers snapshot over derived when set', () => {
    const acc = makeAccount({
      name: 'Checking',
      startingBalance: '0',
      balanceSnapshot: '9999',
    })
    expect(computePortfolioTotal([acc], txns)).toBe(9999)
  })
})
