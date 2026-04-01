import { describe, it, expect } from 'vitest'
import {
  getTotalIncome,
  getTotalExpenses,
  getNetCashFlow,
  getSavingsRate,
  groupByCategory,
  groupByMonth,
  getNetWorth,
  filterByMonth,
  getAvailableMonths,
  filterByCategory,
  filterByType,
} from '@/lib/transactions'
import type { Transaction } from '@/types/transaction'

const sample: Transaction[] = [
  { id: '1', date: '2025-03-01', amount: 5000, type: 'income', category: 'Salary', description: 'Salary', account: 'Checking' },
  { id: '2', date: '2025-03-10', amount: -200, type: 'expense', category: 'Food & Drink', description: 'Groceries', account: 'Checking' },
  { id: '3', date: '2025-03-15', amount: -500, type: 'investment', category: 'Investment', description: 'Buy AAPL', account: 'Brokerage', ticker: 'AAPL', shares: 2.5, price_per_share: 200 },
  { id: '4', date: '2025-02-01', amount: 4800, type: 'income', category: 'Salary', description: 'Salary', account: 'Checking' },
  { id: '5', date: '2025-02-10', amount: -300, type: 'expense', category: 'Transport', description: 'Uber', account: 'Checking' },
]

describe('transactions utils', () => {
  it('calculates total income', () => {
    expect(getTotalIncome(sample)).toBe(9800)
  })

  it('calculates total expenses (absolute)', () => {
    expect(getTotalExpenses(sample)).toBe(500)
  })

  it('calculates net cash flow', () => {
    expect(getNetCashFlow(sample)).toBe(8800)
  })

  it('calculates savings rate', () => {
    expect(getSavingsRate(sample)).toBeCloseTo(0.898, 2)
  })

  it('groups by category', () => {
    const grouped = groupByCategory(sample.filter(t => t.type === 'expense'))
    expect(grouped['Food & Drink']).toBe(200)
    expect(grouped['Transport']).toBe(300)
  })

  it('groups by month', () => {
    const grouped = groupByMonth(sample)
    expect(grouped['2025-03']).toBeDefined()
    expect(grouped['2025-02']).toBeDefined()
  })

  it('calculates net worth from all transactions', () => {
    expect(getNetWorth(sample)).toBe(8800)
  })

  it('filterByMonth returns all when no month given', () => {
    expect(filterByMonth(sample, undefined)).toHaveLength(5)
  })

  it('filterByMonth returns only matching month', () => {
    const result = filterByMonth(sample, '2025-03')
    expect(result).toHaveLength(3)
    expect(result.every(t => t.date.startsWith('2025-03'))).toBe(true)
  })

  it('filterByMonth returns empty for unknown month', () => {
    expect(filterByMonth(sample, '2024-01')).toHaveLength(0)
  })

  it('filterByMonth returns all transactions for malformed month', () => {
    expect(filterByMonth(sample, '2025-0')).toHaveLength(5)
  })

  it('filterByMonth returns all transactions for over-length input', () => {
    // length !== 7 guard treats full date strings as malformed, returns all
    expect(filterByMonth(sample, '2025-03-01')).toHaveLength(5)
  })

  it('getAvailableMonths returns sorted unique months newest first', () => {
    const months = getAvailableMonths(sample)
    expect(months).toEqual(['2025-03', '2025-02'])
  })

  it('getAvailableMonths deduplicates months', () => {
    const months = getAvailableMonths(sample)
    expect(months.length).toBe(new Set(months).size)
  })

  it('filterByCategory returns all when no category given', () => {
    expect(filterByCategory(sample, undefined)).toHaveLength(5)
  })

  it('filterByCategory returns only matching category', () => {
    const result = filterByCategory(sample, 'Salary')
    expect(result).toHaveLength(2)
    expect(result.every(t => t.category === 'Salary')).toBe(true)
  })

  it('filterByCategory returns empty for unknown category', () => {
    expect(filterByCategory(sample, 'Unknown')).toHaveLength(0)
  })

  it('filterByType returns all when no type given', () => {
    expect(filterByType(sample, undefined)).toHaveLength(5)
  })

  it('filterByType returns all when type is "all"', () => {
    expect(filterByType(sample, 'all')).toHaveLength(5)
  })

  it('filterByType returns only matching type', () => {
    const result = filterByType(sample, 'income')
    expect(result).toHaveLength(2)
    expect(result.every(t => t.type === 'income')).toBe(true)
  })
})
