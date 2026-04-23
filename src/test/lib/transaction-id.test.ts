import { describe, expect, it } from 'vitest'
import { generateTransactionId, merchantSlug } from '@/lib/transactions/id'

describe('merchantSlug', () => {
  it('lowercases and replaces non-alphanum with dashes', () => {
    expect(merchantSlug('Woolworths Metro')).toBe('woolworths-metro')
    expect(merchantSlug('7-Eleven #1234')).toBe('7-eleven-1234')
    expect(merchantSlug('Uber Eats — Brunswick')).toBe('uber-eats-brunswick')
  })

  it('collapses consecutive dashes and trims', () => {
    expect(merchantSlug('  ???  Test   ')).toBe('test')
    expect(merchantSlug('foo   bar')).toBe('foo-bar')
  })

  it('caps the slug length', () => {
    const slug = merchantSlug('a'.repeat(200))
    expect(slug.length).toBeLessThanOrEqual(40)
  })

  it('returns "unknown" on empty or all-non-alnum', () => {
    expect(merchantSlug('')).toBe('unknown')
    expect(merchantSlug('???')).toBe('unknown')
  })
})

describe('generateTransactionId', () => {
  it('has shape {date}-{amount-cents}-{slug}-{4char}', () => {
    const id = generateTransactionId({
      date: '2026-04-23',
      amount: -12.5,
      description: 'Target',
    })
    expect(id).toMatch(/^2026-04-23-1250-target-[a-z0-9]{4}$/)
  })

  it('uses absolute cents (strips sign, no decimal)', () => {
    const a = generateTransactionId({ date: '2026-04-23', amount: -12.5, description: 'x' })
    const b = generateTransactionId({ date: '2026-04-23', amount: 12.5, description: 'x' })
    expect(a.startsWith('2026-04-23-1250-')).toBe(true)
    expect(b.startsWith('2026-04-23-1250-')).toBe(true)
  })

  it('produces unique IDs across calls for identical inputs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      ids.add(
        generateTransactionId({ date: '2026-04-23', amount: -5, description: 'Coffee' }),
      )
    }
    expect(ids.size).toBe(50)
  })

  it('rounds cents correctly for floating-point noise', () => {
    const id = generateTransactionId({
      date: '2026-04-23',
      amount: -(0.1 + 0.2), // 0.30000000000000004
      description: 'x',
    })
    expect(id.startsWith('2026-04-23-30-')).toBe(true)
  })
})
