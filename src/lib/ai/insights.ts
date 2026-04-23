import { createHash } from 'node:crypto'
import { generateObject } from 'ai'
import { MODELS } from './gateway'
import {
  MonthlyInsightSchema,
  WeeklyInsightSchema,
  type MonthlyInsight,
  type WeeklyInsight,
} from './schemas'
import { buildInsightPrompt, type InsightPromptInput } from './prompts'
import { db } from '@/db/client'
import { transactions as txTable } from '@/db/schema'
import { and, gte, lte } from 'drizzle-orm'
import {
  isoWeekRange,
  monthRange,
  referenceMonthRange,
  referenceWeekRange,
} from '@/lib/periods'
import { listBudgetsForMonth } from '@/db/queries/budgets'
import { getInsightByPeriod, upsertInsight } from '@/db/queries/insights'
import type { Transaction } from '@/types/transaction'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

interface TxRow {
  id: string
  date: string
  amount: number
  type: string
  category: string
  description: string
  account: string
  ticker: string | null
  shares: number | null
}

async function loadTxnsInRange(start: string, end: string): Promise<TxRow[]> {
  const rows = await db
    .select({
      id: txTable.id,
      date: txTable.date,
      amount: txTable.amount,
      type: txTable.type,
      category: txTable.category,
      description: txTable.description,
      account: txTable.account,
      ticker: txTable.ticker,
      shares: txTable.shares,
    })
    .from(txTable)
    .where(and(gte(txTable.date, start), lte(txTable.date, end)))
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    type: r.type,
    category: r.category,
    description: r.description,
    account: r.account,
    ticker: r.ticker,
    shares: r.shares === null ? null : Number(r.shares),
  }))
}

function computeTotals(txns: TxRow[]) {
  let income = 0
  let expenses = 0
  const byCat = new Map<string, number>()
  for (const t of txns) {
    if (t.type === 'income') income += t.amount
    if (t.type === 'expense') {
      const abs = Math.abs(t.amount)
      expenses += abs
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + abs)
    }
  }
  return { income, expenses, net: income - expenses, byCat }
}

function computeHoldings(txns: TxRow[]) {
  const h = new Map<string, { ticker: string; shares: number; cost: number }>()
  for (const t of txns) {
    if (t.type !== 'investment' || !t.ticker) continue
    const cur = h.get(t.ticker) ?? { ticker: t.ticker, shares: 0, cost: 0 }
    cur.shares += t.shares ?? 0
    cur.cost += Math.abs(t.amount)
    h.set(t.ticker, cur)
  }
  return Array.from(h.values())
}

interface GeneratePeriodArgs {
  kind: 'weekly' | 'monthly'
  periodKey: string
  force?: boolean
}

export async function generateInsightForPeriod(
  args: GeneratePeriodArgs,
): Promise<{ skipped: boolean; insight: WeeklyInsight | MonthlyInsight | null }> {
  const { kind, periodKey, force } = args

  const primaryRange = kind === 'weekly' ? isoWeekRange(periodKey) : monthRange(periodKey)
  const referenceRange =
    kind === 'weekly' ? referenceWeekRange(periodKey) : referenceMonthRange(periodKey)

  const [periodTxns, refTxns] = await Promise.all([
    loadTxnsInRange(primaryRange.start, primaryRange.end),
    loadTxnsInRange(referenceRange.start, referenceRange.end),
  ])

  const hashInput = [...periodTxns, ...refTxns]
    .map((t) => t.id)
    .sort()
    .join(',')
  const inputHash = sha256(hashInput)

  if (!force) {
    const existing = await getInsightByPeriod(kind, periodKey)
    if (existing && existing.inputHash === inputHash) {
      return { skipped: true, insight: null }
    }
  }

  const totals = computeTotals(periodTxns)
  const refTotals = computeTotals(refTxns)

  const byCategory = Array.from(totals.byCat.entries()).map(([category, amount]) => {
    const priorAvg =
      kind === 'weekly'
        ? (refTotals.byCat.get(category) ?? 0) / 4
        : (refTotals.byCat.get(category) ?? 0) / 6
    return { category, amount, priorAverage: priorAvg }
  }).sort((a, b) => b.amount - a.amount)

  const denom = kind === 'weekly' ? 4 : 6
  const refAvg = {
    income: refTotals.income / denom,
    expenses: refTotals.expenses / denom,
    net: refTotals.net / denom,
  }

  const budgetMonth = kind === 'monthly' ? periodKey : primaryRange.start.slice(0, 7)
  const budgetRows = await listBudgetsForMonth(budgetMonth)
  const budgets = budgetRows
    .filter((b) => b.month === budgetMonth || b.month === null)
    .map((b) => ({ category: b.category, capCents: b.capCents }))

  const topTxns = [...periodTxns]
    .filter((t) => t.type === 'expense' || t.type === 'income')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10)
    .map((t) => ({ date: t.date, amount: t.amount, description: t.description, category: t.category }))

  const investmentHoldings = kind === 'monthly' ? computeHoldings([...periodTxns, ...refTxns]) : undefined

  const promptInput: InsightPromptInput = {
    kind,
    periodKey,
    periodStart: primaryRange.start,
    periodEnd: primaryRange.end,
    referenceLabel: kind === 'weekly' ? 'prior 4 weeks' : 'trailing 6 months',
    totals: { ...totals, byCategory },
    referenceTotals: refAvg,
    budgets,
    topTransactions: topTxns,
    investmentHoldings,
  }

  const { system, user } = buildInsightPrompt(promptInput)

  const schema = kind === 'weekly' ? WeeklyInsightSchema : MonthlyInsightSchema
  const model = kind === 'weekly' ? MODELS.weeklyInsight : MODELS.monthlyInsight

  const { object } = await generateObject({
    model,
    schema,
    system,
    prompt: user,
    temperature: 0.3,
  })

  await upsertInsight({
    periodType: kind,
    periodKey,
    model,
    narrative: object.narrative,
    summaryJson: object,
    inputHash,
  })

  return { skipped: false, insight: object }
}

export function computeHoldingsForTransactions(txns: Transaction[]) {
  return computeHoldings(
    txns.map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      account: t.account,
      ticker: t.ticker ?? null,
      shares: t.shares ?? null,
    })),
  )
}
