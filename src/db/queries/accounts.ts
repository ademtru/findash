import { db } from '@/db/client'
import { accounts, type AccountType } from '@/db/schema'
import { eq } from 'drizzle-orm'

export function listAccounts() {
  return db.select().from(accounts).orderBy(accounts.createdAt)
}

export async function getAccountById(id: string) {
  const [row] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
  return row ?? null
}

export async function insertAccount(data: { name: string; institution?: string | null; last4: string }) {
  const [row] = await db.insert(accounts).values(data).returning()
  if (!row) throw new Error('insertAccount: insert returned no row')
  return row
}

export type AccountPatch = Partial<{
  name: string
  institution: string | null
  last4: string
  type: AccountType
  startingBalance: string
  startingDate: string
  balanceSnapshot: string | null
  snapshotAt: Date | null
}>

export async function updateAccount(id: string, patch: AccountPatch) {
  const [row] = await db.update(accounts).set(patch).where(eq(accounts.id, id)).returning()
  return row ?? null
}

export async function deleteAccount(id: string) {
  await db.delete(accounts).where(eq(accounts.id, id))
}
