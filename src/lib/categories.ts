import type { TransactionType } from '@/types/transaction'

export const DEFAULT_CATEGORIES: Record<TransactionType, string[]> = {
  expense: [
    'Food & Drink',
    'Groceries',
    'Transport',
    'Utilities',
    'Rent/Mortgage',
    'Entertainment',
    'Shopping',
    'Health',
    'Travel',
    'Subscriptions',
    'Personal Care',
    'Insurance',
    'Gifts',
    'Education',
    'Fees & Charges',
    'Other Expense',
  ],
  income: [
    'Salary',
    'Freelance',
    'Bonus',
    'Interest',
    'Dividends',
    'Tax Refund',
    'Gift Received',
    'Other Income',
  ],
  transfer: [
    'Transfer',
    'Credit Card Payment',
    'Savings Transfer',
  ],
  investment: [
    'Stocks',
    'ETFs',
    'Crypto',
    'Retirement',
    'Bonds',
    'Other Investment',
  ],
}

export const ALL_DEFAULT_CATEGORIES: string[] = Array.from(
  new Set(Object.values(DEFAULT_CATEGORIES).flat()),
)

export function mergeCategoriesForType(
  type: TransactionType,
  userHistory: string[],
): string[] {
  const defaults = DEFAULT_CATEGORIES[type]
  const seen = new Set<string>()
  const merged: string[] = []
  for (const c of defaults) {
    if (!seen.has(c)) {
      seen.add(c)
      merged.push(c)
    }
  }
  for (const c of userHistory) {
    if (!seen.has(c)) {
      seen.add(c)
      merged.push(c)
    }
  }
  return merged
}
