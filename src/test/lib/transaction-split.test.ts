import { describe, it, expect } from 'vitest'
import { validateSplits } from '@/lib/transactions/split'

describe('validateSplits', () => {
  it('returns null when splits sum exactly to original', () => {
    expect(validateSplits(100, [{ amount: 60 }, { amount: 40 }])).toBeNull()
  })

  it('returns error when splits sum less than original', () => {
    expect(validateSplits(100, [{ amount: 60 }, { amount: 30 }])).not.toBeNull()
  })

  it('returns error when splits sum more than original', () => {
    expect(validateSplits(100, [{ amount: 60 }, { amount: 50 }])).not.toBeNull()
  })

  it('returns error when fewer than 2 splits', () => {
    expect(validateSplits(100, [{ amount: 100 }])).not.toBeNull()
  })

  it('returns error when any split has zero amount', () => {
    expect(validateSplits(100, [{ amount: 100 }, { amount: 0 }])).not.toBeNull()
  })

  it('handles floating point within tolerance', () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    expect(validateSplits(100, [
      { amount: 33.33 },
      { amount: 33.33 },
      { amount: 33.34 },
    ])).toBeNull()
  })

  it('handles negative original amount (expense/split)', () => {
    expect(validateSplits(-100, [{ amount: -60 }, { amount: -40 }])).toBeNull()
  })
})
