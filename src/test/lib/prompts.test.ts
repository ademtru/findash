import { describe, expect, it } from 'vitest'
import { buildCategorisePrompt } from '@/lib/ai/prompts'

describe('buildCategorisePrompt', () => {
  it('includes transaction details', () => {
    const { user } = buildCategorisePrompt({
      description: 'Coffee Shop',
      amount: -5.5,
      account: 'Chase',
      activeCategories: ['Food & Drink', 'Groceries'],
      merchantHints: [],
    })
    expect(user).toContain('Coffee Shop')
    expect(user).toContain('-$5.50')
    expect(user).toContain('Chase')
    expect(user).toContain('Food & Drink')
  })

  it('falls back to a placeholder when no categories exist', () => {
    const { user } = buildCategorisePrompt({
      description: 'x',
      amount: 0,
      account: 'a',
      activeCategories: [],
      merchantHints: [],
    })
    expect(user).toMatch(/pick a reasonable fresh one/)
  })

  it('formats merchant hints as a list', () => {
    const { user } = buildCategorisePrompt({
      description: 'x',
      amount: -1,
      account: 'a',
      activeCategories: [],
      merchantHints: [
        { merchantSlug: 'woolworths', chosenCategory: 'Groceries', acceptedCount: 5 },
      ],
    })
    expect(user).toContain('woolworths')
    expect(user).toContain('Groceries (used 5x)')
  })
})
