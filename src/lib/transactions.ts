import type { Transaction } from '@/types/transaction'
import { format, parseISO } from 'date-fns'

export function getTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
}

export function getTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function getNetCashFlow(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}

export function getSavingsRate(transactions: Transaction[]): number {
  const income = getTotalIncome(transactions)
  if (income === 0) return 0
  // Outflows include both expenses and investments (negative amounts)
  const outflows = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return (income - outflows) / income
}

export function groupByCategory(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce((acc, t) => {
    const key = t.category
    acc[key] = (acc[key] ?? 0) + Math.abs(t.amount)
    return acc
  }, {} as Record<string, number>)
}

export function groupByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
  return transactions.reduce((acc, t) => {
    const month = format(parseISO(t.date), 'yyyy-MM')
    acc[month] = [...(acc[month] ?? []), t]
    return acc
  }, {} as Record<string, Transaction[]>)
}

export function getNetWorth(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map(t => t.date.slice(0, 7))))
    .sort((a, b) => b.localeCompare(a))
}

export function filterByMonth(transactions: Transaction[], month?: string): Transaction[] {
  if (!month || month.length !== 7) return transactions
  return transactions.filter(t => t.date.startsWith(month))
}

export function getInvestmentHoldings(transactions: Transaction[]) {
  const investments = transactions.filter(t => t.type === 'investment' && t.ticker)
  const holdings: Record<string, { shares: number; cost: number; ticker: string }> = {}

  for (const t of investments) {
    const ticker = t.ticker!
    if (!holdings[ticker]) holdings[ticker] = { shares: 0, cost: 0, ticker }
    holdings[ticker].shares += t.shares ?? 0
    holdings[ticker].cost += Math.abs(t.amount)
  }

  return Object.values(holdings)
}
