import { describe, expect, it } from 'vitest'
import {
  getMonthSpendByCategory,
  monthProgress,
  paceStatus,
  resolveCapCents,
  type BudgetRecord,
} from '@/lib/budgets'
import type { Transaction } from '@/types/transaction'

const base: Transaction = {
  id: 'x',
  date: '2026-04-10',
  amount: -50,
  type: 'expense',
  category: 'Food & Drink',
  description: 'x',
  account: 'Chase',
}

describe('getMonthSpendByCategory', () => {
  it('sums absolute expense amounts within the month', () => {
    const txns: Transaction[] = [
      { ...base, id: 'a', date: '2026-04-01', amount: -20, category: 'Groceries' },
      { ...base, id: 'b', date: '2026-04-15', amount: -30, category: 'Groceries' },
      { ...base, id: 'c', date: '2026-04-20', amount: -10, category: 'Food & Drink' },
    ]
    const map = getMonthSpendByCategory(txns, '2026-04')
    expect(map.get('Groceries')).toBe(50)
    expect(map.get('Food & Drink')).toBe(10)
  })

  it('ignores income and transfers', () => {
    const txns: Transaction[] = [
      { ...base, id: 'a', amount: 1000, type: 'income', category: 'Salary' },
      { ...base, id: 'b', amount: -100, type: 'transfer', category: 'Transfer' },
      { ...base, id: 'c', amount: -30, type: 'expense', category: 'Food & Drink' },
    ]
    const map = getMonthSpendByCategory(txns, '2026-04')
    expect(map.get('Salary')).toBeUndefined()
    expect(map.get('Transfer')).toBeUndefined()
    expect(map.get('Food & Drink')).toBe(30)
  })

  it('ignores other months', () => {
    const txns: Transaction[] = [
      { ...base, id: 'a', date: '2026-03-31', amount: -50 },
      { ...base, id: 'b', date: '2026-05-01', amount: -50 },
      { ...base, id: 'c', date: '2026-04-30', amount: -10 },
    ]
    const map = getMonthSpendByCategory(txns, '2026-04')
    expect(map.get('Food & Drink')).toBe(10)
  })
})

describe('resolveCapCents', () => {
  const rows: BudgetRecord[] = [
    { id: '1', month: '2026-04', category: 'Groceries', capCents: 40000 },
    { id: '2', month: null, category: 'Groceries', capCents: 30000 },
    { id: '3', month: null, category: 'Transport', capCents: 15000 },
  ]

  it('prefers the month-specific cap', () => {
    expect(resolveCapCents(rows, 'Groceries', '2026-04')).toBe(40000)
  })

  it('falls back to the default cap', () => {
    expect(resolveCapCents(rows, 'Transport', '2026-04')).toBe(15000)
  })

  it('returns null when no cap exists', () => {
    expect(resolveCapCents(rows, 'Entertainment', '2026-04')).toBeNull()
  })
})

describe('monthProgress', () => {
  it('returns 0 at month start', () => {
    const p = monthProgress('2026-04', new Date('2026-04-01T00:00:00Z'))
    expect(p.daysElapsed).toBeGreaterThanOrEqual(1)
    expect(p.totalDays).toBe(30)
  })

  it('returns full at month end', () => {
    const p = monthProgress('2026-04', new Date('2026-04-30T23:59:59Z'))
    expect(p.daysElapsed).toBe(30)
    expect(p.totalDays).toBe(30)
    expect(p.fraction).toBeCloseTo(1, 1)
  })

  it('clamps when today is past the month', () => {
    const p = monthProgress('2026-04', new Date('2026-06-01T00:00:00Z'))
    expect(p.fraction).toBe(1)
    expect(p.daysElapsed).toBe(30)
  })

  it('is zero for a future month', () => {
    const p = monthProgress('2026-05', new Date('2026-04-01T00:00:00Z'))
    expect(p.fraction).toBe(0)
  })
})

describe('paceStatus', () => {
  it('reports under when spent is ahead but linear pace dictates more', () => {
    // 10% of month elapsed, 5% of cap spent → under pace
    const s = paceStatus({ spent: 5, capCents: 10000, fraction: 0.1 })
    expect(s.status).toBe('under')
  })

  it('reports over when spent exceeds linear pace', () => {
    // 50% of month elapsed, 80% of cap spent → over pace
    const s = paceStatus({ spent: 80, capCents: 10000, fraction: 0.5 })
    expect(s.status).toBe('over')
  })

  it('reports over when cap is exceeded', () => {
    const s = paceStatus({ spent: 150, capCents: 10000, fraction: 0.5 })
    expect(s.status).toBe('over')
    expect(s.percentUsed).toBeGreaterThanOrEqual(1)
  })

  it('handles zero cap gracefully', () => {
    const s = paceStatus({ spent: 10, capCents: 0, fraction: 0.5 })
    expect(s.percentUsed).toBe(1)
    expect(s.status).toBe('over')
  })
})
