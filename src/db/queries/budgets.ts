import { db } from '@/db/client'
import { budgets, type BudgetRow, type NewBudgetRow } from '@/db/schema'
import type { BudgetRecord } from '@/lib/budgets'
import { and, eq, isNull, or, sql } from 'drizzle-orm'

function rowToRecord(r: BudgetRow): BudgetRecord {
  return {
    id: r.id,
    month: r.month,
    category: r.category,
    capCents: r.capCents,
    note: r.note,
  }
}

export async function listAllBudgets(): Promise<BudgetRecord[]> {
  const rows = await db.select().from(budgets).orderBy(budgets.category)
  return rows.map(rowToRecord)
}

export async function listBudgetsForMonth(month: string): Promise<BudgetRecord[]> {
  const rows = await db
    .select()
    .from(budgets)
    .where(or(eq(budgets.month, month), isNull(budgets.month)))
    .orderBy(budgets.category)
  return rows.map(rowToRecord)
}

export interface UpsertBudgetInput {
  month: string | null
  category: string
  capCents: number
  note?: string | null
}

export async function upsertBudget(input: UpsertBudgetInput): Promise<BudgetRecord> {
  const values: NewBudgetRow = {
    month: input.month,
    category: input.category,
    capCents: input.capCents,
    note: input.note ?? null,
    updatedAt: new Date(),
  }
  const [row] = await db
    .insert(budgets)
    .values(values)
    .onConflictDoUpdate({
      target: [budgets.month, budgets.category],
      set: {
        capCents: values.capCents,
        note: values.note,
        updatedAt: values.updatedAt,
      },
    })
    .returning()
  return rowToRecord(row)
}

export async function deleteBudget(id: string): Promise<boolean> {
  const rows = await db.delete(budgets).where(eq(budgets.id, id)).returning({ id: budgets.id })
  return rows.length > 0
}

export async function copyMonth(fromMonth: string, toMonth: string): Promise<number> {
  const source = await db
    .select()
    .from(budgets)
    .where(eq(budgets.month, fromMonth))
  if (source.length === 0) return 0

  const values = source.map((r) => ({
    month: toMonth,
    category: r.category,
    capCents: r.capCents,
    note: r.note,
    updatedAt: new Date(),
  }))

  const inserted = await db
    .insert(budgets)
    .values(values)
    .onConflictDoUpdate({
      target: [budgets.month, budgets.category],
      set: {
        capCents: sql`excluded.cap_cents`,
        note: sql`excluded.note`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: budgets.id })
  return inserted.length
}

export async function hasMonthBudgets(month: string): Promise<boolean> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(budgets)
    .where(and(eq(budgets.month, month)))
  return rows[0].c > 0
}
