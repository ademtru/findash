import type { Transaction } from '@/types/transaction'
import { merchantSlug } from './id'

const WINDOW_DAYS = 1

function dayDiff(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime()
  return Math.abs(Math.round(ms / 86_400_000))
}

function amountCents(n: number): number {
  return Math.round(Math.abs(n) * 100)
}

export function findFuzzyDuplicate(
  candidate: Pick<Transaction, 'date' | 'amount' | 'description'>,
  existing: Transaction[],
): Transaction | null {
  const cCents = amountCents(candidate.amount)
  const cSlug = merchantSlug(candidate.description)

  for (const t of existing) {
    if (amountCents(t.amount) !== cCents) continue
    if (dayDiff(t.date, candidate.date) > WINDOW_DAYS) continue
    if (merchantSlug(t.description) !== cSlug) continue
    return t
  }
  return null
}
