import { describe, it, expect } from 'vitest'
import {
  computeFireNumber,
  computeYearsToFire,
  computeCoastFire,
  computeAnnualExpenseDefault,
  computeMonthlyContributionDefault,
} from '@/lib/fire'
import type { Transaction } from '@/types/transaction'

describe('computeFireNumber', () => {
  it('divides annual expenses by withdrawal rate', () => {
    expect(computeFireNumber(40_000, 0.04)).toBe(1_000_000)
    expect(computeFireNumber(80_000, 0.03)).toBeCloseTo(2_666_667, -1)
  })

  it('returns Infinity for non-positive withdrawal rate', () => {
    expect(computeFireNumber(40_000, 0)).toBe(Infinity)
    expect(computeFireNumber(40_000, -0.01)).toBe(Infinity)
  })
})

describe('computeYearsToFire', () => {
  it('returns 0 when already at FIRE', () => {
    const r = computeYearsToFire(1_000_000, 1000, 1_000_000, 0.07)
    expect(r.years).toBe(0)
    expect(r.reachedAtMonth).toBe(0)
  })

  it('returns finite years with positive contributions and growth', () => {
    const r = computeYearsToFire(0, 1000, 1_000_000, 0.07)
    expect(r.years).toBeGreaterThan(20)
    expect(r.years).toBeLessThan(40)
  })

  it('returns Infinity with zero growth and contribution that cannot reach target', () => {
    const r = computeYearsToFire(0, 0, 100_000, 0)
    expect(r.years).toBe(Infinity)
  })

  it('produces a growing monthly series', () => {
    const r = computeYearsToFire(10_000, 500, 100_000, 0.06)
    const first = r.monthlySeries[0]!.value
    const second = r.monthlySeries[1]!.value
    expect(second).toBeGreaterThan(first)
  })
})

describe('computeCoastFire', () => {
  it('discounts FIRE number by compounded growth', () => {
    const r = computeCoastFire(0, 1_000_000, 30, 65, 0.07)
    // 1M / 1.07^35 ≈ 93,663
    expect(r.coastNumberToday).toBeCloseTo(93_663, -1)
  })

  it('marks alreadyCoasting when portfolio >= coast number', () => {
    const r = computeCoastFire(100_000, 1_000_000, 30, 65, 0.07)
    expect(r.alreadyCoasting).toBe(true)
  })

  it('marks not coasting when portfolio is below coast number', () => {
    const r = computeCoastFire(10_000, 1_000_000, 30, 65, 0.07)
    expect(r.alreadyCoasting).toBe(false)
  })

  it('returns Infinity coastAge when portfolio is zero', () => {
    const r = computeCoastFire(0, 1_000_000, 30, 65, 0.07)
    expect(r.coastAge).toBe(Infinity)
  })

  it('computes projectedAtTargetAge as portfolio compounded over years remaining', () => {
    const r = computeCoastFire(100_000, 1_000_000, 30, 65, 0.07)
    // 100k * 1.07^35 ≈ 1,067,658
    expect(r.projectedAtTargetAge).toBeCloseTo(1_067_658, -1)
  })
})

function txn(date: string, amount: number, type: Transaction['type']): Transaction {
  return { id: date + amount, date, amount, type, category: 'X', description: 'X', account: 'Main' }
}

describe('computeAnnualExpenseDefault', () => {
  it('averages the last 3 full months and multiplies by 12', () => {
    const today = new Date()
    const cy = today.getUTCFullYear()
    const cm = today.getUTCMonth() + 1
    const prev = (n: number) => {
      const m = ((cm - n - 1 + 12) % 12) + 1
      const y = cy - (cm - n <= 0 ? 1 : 0)
      return `${y}-${String(m).padStart(2, '0')}-15`
    }
    const txns = [
      txn(prev(1), -1000, 'expense'),
      txn(prev(2), -1500, 'expense'),
      txn(prev(3), -2000, 'expense'),
      txn(prev(0), -50_000, 'expense'), // current month - excluded
    ]
    // (1000 + 1500 + 2000) / 3 = 1500/mo → 18000/yr
    expect(computeAnnualExpenseDefault(txns)).toBeCloseTo(18_000, -1)
  })

  it('returns 0 when no past expenses', () => {
    expect(computeAnnualExpenseDefault([])).toBe(0)
  })
})

describe('computeMonthlyContributionDefault', () => {
  it('averages monthly investment outflows over the last 3 full months', () => {
    const today = new Date()
    const cy = today.getUTCFullYear()
    const cm = today.getUTCMonth() + 1
    const prev = (n: number) => {
      const m = ((cm - n - 1 + 12) % 12) + 1
      const y = cy - (cm - n <= 0 ? 1 : 0)
      return `${y}-${String(m).padStart(2, '0')}-15`
    }
    const txns = [
      txn(prev(1), -500, 'investment'),
      txn(prev(2), -1000, 'investment'),
      txn(prev(3), -1500, 'investment'),
      txn(prev(1), 200, 'investment'), // inflow (sell) - excluded
    ]
    // (500 + 1000 + 1500) / 3 = 1000
    expect(computeMonthlyContributionDefault(txns)).toBeCloseTo(1000, -1)
  })

  it('returns 0 when no investment outflows', () => {
    expect(computeMonthlyContributionDefault([])).toBe(0)
  })
})
