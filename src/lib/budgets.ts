import type { Transaction } from '@/types/transaction'

export interface BudgetRecord {
  id: string
  month: string | null
  category: string
  capCents: number
  note?: string | null
}

export function getMonthSpendByCategory(
  txns: Transaction[],
  month: string,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of txns) {
    if (!t.date.startsWith(month)) continue
    if (t.type !== 'expense') continue
    const spent = Math.abs(t.amount)
    out.set(t.category, (out.get(t.category) ?? 0) + spent)
  }
  return out
}

export function resolveCapCents(
  rows: BudgetRecord[],
  category: string,
  month: string,
): number | null {
  let monthSpecific: number | null = null
  let defaultCap: number | null = null
  for (const r of rows) {
    if (r.category !== category) continue
    if (r.month === month) monthSpecific = r.capCents
    else if (r.month === null) defaultCap = r.capCents
  }
  return monthSpecific ?? defaultCap
}

export interface MonthProgress {
  totalDays: number
  daysElapsed: number
  daysRemaining: number
  fraction: number
}

function lastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function monthProgress(month: string, now: Date = new Date()): MonthProgress {
  const totalDays = lastDayOfMonth(month)
  const [y, m] = month.split('-').map(Number)
  const startOfMonth = new Date(y, m - 1, 1)
  const endOfMonth = new Date(y, m - 1, totalDays, 23, 59, 59)

  if (now < startOfMonth) {
    return { totalDays, daysElapsed: 0, daysRemaining: totalDays, fraction: 0 }
  }
  if (now > endOfMonth) {
    return { totalDays, daysElapsed: totalDays, daysRemaining: 0, fraction: 1 }
  }
  const daysElapsedRaw = Math.ceil(
    (now.getTime() - startOfMonth.getTime()) / 86_400_000,
  )
  const daysElapsed = Math.min(totalDays, Math.max(1, daysElapsedRaw))
  return {
    totalDays,
    daysElapsed,
    daysRemaining: totalDays - daysElapsed,
    fraction: daysElapsed / totalDays,
  }
}

export interface PaceInput {
  spent: number
  capCents: number
  fraction: number
}

export interface PaceResult {
  percentUsed: number
  expectedFraction: number
  status: 'under' | 'on-track' | 'over'
  remainingCents: number
  projectedCents: number
}

const PACE_TOLERANCE = 0.2 // ±20% of expected

export function paceStatus({ spent, capCents, fraction }: PaceInput): PaceResult {
  const cap = capCents / 100
  const percentUsed = cap <= 0 ? 1 : Math.max(0, Math.min(2, spent / cap))
  const projected = fraction <= 0 ? 0 : spent / fraction
  const projectedCents = Math.round(projected * 100)
  const remainingCents = Math.round(Math.max(0, cap - spent) * 100)

  let status: 'under' | 'on-track' | 'over'
  if (percentUsed >= 1) {
    status = 'over'
  } else if (fraction <= 0) {
    status = 'under'
  } else {
    const ratio = percentUsed / fraction
    if (ratio > 1 + PACE_TOLERANCE) status = 'over'
    else if (ratio < 1 - PACE_TOLERANCE) status = 'under'
    else status = 'on-track'
  }

  return {
    percentUsed,
    expectedFraction: fraction,
    status,
    remainingCents,
    projectedCents,
  }
}

export function currentMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
