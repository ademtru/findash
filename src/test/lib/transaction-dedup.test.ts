import { describe, expect, it } from 'vitest'
import { findFuzzyDuplicate } from '@/lib/transactions/dedup'
import type { Transaction } from '@/types/transaction'

const base: Transaction = {
  id: '2026-04-23-500-coffee-a1b2',
  date: '2026-04-23',
  amount: -5,
  type: 'expense',
  category: 'Food & Drink',
  description: 'Coffee Shop',
  account: 'Chase Checking',
}

describe('findFuzzyDuplicate', () => {
  it('returns null when nothing matches', () => {
    const candidate = { ...base, id: 'x', description: 'Groceries', amount: -50 }
    expect(findFuzzyDuplicate(candidate, [base])).toBeNull()
  })

  it('matches exact date + amount + slug + account', () => {
    const candidate = { ...base, id: 'x', description: 'coffee shop' }
    expect(findFuzzyDuplicate(candidate, [base])?.id).toBe(base.id)
  })

  it('matches within a 1-day window', () => {
    const candidate = { ...base, id: 'x', date: '2026-04-24' }
    expect(findFuzzyDuplicate(candidate, [base])?.id).toBe(base.id)
  })

  it('does not match beyond a 1-day window', () => {
    const candidate = { ...base, id: 'x', date: '2026-04-26' }
    expect(findFuzzyDuplicate(candidate, [base])).toBeNull()
  })

  it('does not match a different amount', () => {
    const candidate = { ...base, id: 'x', amount: -6 }
    expect(findFuzzyDuplicate(candidate, [base])).toBeNull()
  })

  it('ignores sign differences in amount (outflow vs refund display)', () => {
    const candidate = { ...base, id: 'x', amount: 5 }
    expect(findFuzzyDuplicate(candidate, [base])?.id).toBe(base.id)
  })
})
