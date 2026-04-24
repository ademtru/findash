import { db } from '@/db/client'
import { transactions, type NewTransactionRow, type TransactionRow } from '@/db/schema'
import type { Transaction } from '@/types/transaction'
import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm'

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    type: r.type as Transaction['type'],
    category: r.category,
    description: r.description,
    account: r.account,
    ticker: r.ticker ?? null,
    shares: r.shares === null ? null : Number(r.shares),
    price_per_share: r.pricePerShare === null ? null : Number(r.pricePerShare),
    groupId: r.groupId ?? null,
  }
}

export async function listTransactions(filters: {
  month?: string
  category?: string
  type?: string
} = {}): Promise<Transaction[]> {
  const conditions = []
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    const start = `${filters.month}-01`
    const [y, m] = filters.month.split('-').map(Number)
    const nextY = m === 12 ? y + 1 : y
    const nextM = m === 12 ? 1 : m + 1
    const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`
    conditions.push(gte(transactions.date, start), lt(transactions.date, end))
  }
  if (filters.category) conditions.push(eq(transactions.category, filters.category))
  if (filters.type && filters.type !== 'all') conditions.push(eq(transactions.type, filters.type))

  const rows = await db
    .select()
    .from(transactions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))

  return rows.map(rowToTransaction)
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
  return rows[0] ? rowToTransaction(rows[0]) : null
}

export async function insertTransaction(input: NewTransactionRow): Promise<Transaction> {
  const [row] = await db.insert(transactions).values(input).returning()
  return rowToTransaction(row)
}

export async function insertManyTransactions(inputs: NewTransactionRow[]): Promise<number> {
  if (inputs.length === 0) return 0
  const rows = await db
    .insert(transactions)
    .values(inputs)
    .onConflictDoNothing({ target: transactions.id })
    .returning({ id: transactions.id })
  return rows.length
}

export async function transactionCount(): Promise<number> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(transactions)
  return row.c
}

export async function distinctCategories(): Promise<string[]> {
  const rows = await db
    .select({ category: transactions.category, c: sql<number>`count(*)::int` })
    .from(transactions)
    .groupBy(transactions.category)
    .orderBy(desc(sql`count(*)`))
  return rows.map((r) => r.category)
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const rows = await db
    .delete(transactions)
    .where(eq(transactions.id, id))
    .returning({ id: transactions.id })
  return rows.length > 0
}

export async function combineTransactions(ids: string[]): Promise<string> {
  const groupId = crypto.randomUUID()
  await db
    .update(transactions)
    .set({ groupId, updatedAt: new Date() })
    .where(inArray(transactions.id, ids))
  return groupId
}

export async function uncombineGroup(groupId: string): Promise<void> {
  await db
    .update(transactions)
    .set({ groupId: null, updatedAt: new Date() })
    .where(eq(transactions.groupId, groupId))
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, 'date' | 'amount' | 'type' | 'category' | 'description' | 'account' | 'ticker' | 'shares' | 'price_per_share'>>,
): Promise<Transaction | null> {
  const values: Partial<NewTransactionRow> & { updatedAt: Date } = { updatedAt: new Date() }
  if (patch.date !== undefined) values.date = patch.date
  if (patch.amount !== undefined) values.amount = String(patch.amount)
  if (patch.type !== undefined) values.type = patch.type
  if (patch.category !== undefined) values.category = patch.category
  if (patch.description !== undefined) values.description = patch.description
  if (patch.account !== undefined) values.account = patch.account
  if (patch.ticker !== undefined) values.ticker = patch.ticker
  if (patch.shares !== undefined) values.shares = patch.shares === null ? null : String(patch.shares)
  if (patch.price_per_share !== undefined)
    values.pricePerShare = patch.price_per_share === null ? null : String(patch.price_per_share)

  const [row] = await db
    .update(transactions)
    .set(values)
    .where(eq(transactions.id, id))
    .returning()
  return row ? rowToTransaction(row) : null
}
