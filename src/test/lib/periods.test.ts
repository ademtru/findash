import { describe, expect, it } from 'vitest'
import {
  previousMonthKey,
  previousIsoWeekKey,
  isoWeekRange,
  monthRange,
  referenceWeekRange,
  referenceMonthRange,
} from '@/lib/periods'

describe('previousMonthKey', () => {
  it('returns the prior month', () => {
    expect(previousMonthKey(new Date('2026-04-15T06:00:00+10:00'))).toBe('2026-03')
  })
  it('wraps across year boundaries', () => {
    expect(previousMonthKey(new Date('2026-01-05T06:00:00+10:00'))).toBe('2025-12')
  })
})

describe('previousIsoWeekKey', () => {
  it('returns the ISO week that just ended', () => {
    // Monday April 27 2026 in Sydney — week 17 just ended Sunday 26th
    expect(previousIsoWeekKey(new Date('2026-04-27T11:00:00+10:00'))).toBe('2026-W17')
  })
})

describe('isoWeekRange', () => {
  it('returns Monday to Sunday for an ISO week key', () => {
    const { start, end } = isoWeekRange('2026-W17')
    expect(start).toBe('2026-04-20')
    expect(end).toBe('2026-04-26')
  })
})

describe('monthRange', () => {
  it('returns first and last day of a month', () => {
    const { start, end } = monthRange('2026-04')
    expect(start).toBe('2026-04-01')
    expect(end).toBe('2026-04-30')
  })
  it('handles February in a leap year', () => {
    const { start, end } = monthRange('2024-02')
    expect(start).toBe('2024-02-01')
    expect(end).toBe('2024-02-29')
  })
})

describe('referenceWeekRange', () => {
  it('returns the 4 weeks ending the week before periodKey', () => {
    const { start, end } = referenceWeekRange('2026-W17')
    // week 17 start is Apr 20; 4 weeks back is Mar 23; reference ends Apr 19 (day before target week)
    expect(start).toBe('2026-03-23')
    expect(end).toBe('2026-04-19')
  })
})

describe('referenceMonthRange', () => {
  it('returns 6 months trailing before target month', () => {
    const { start, end } = referenceMonthRange('2026-04')
    expect(start).toBe('2025-10-01')
    expect(end).toBe('2026-03-31')
  })
})
