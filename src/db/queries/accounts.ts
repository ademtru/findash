import { db } from '@/db/client'
import { accounts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export function listAccounts() {
  return db.select().from(accounts).orderBy(accounts.createdAt)
}

export async function insertAccount(data: { name: string; institution?: string | null; last4: string }) {
  const [row] = await db.insert(accounts).values(data).returning()
  if (!row) throw new Error('insertAccount: insert returned no row')
  return row
}

export async function deleteAccount(id: string) {
  await db.delete(accounts).where(eq(accounts.id, id))
}
