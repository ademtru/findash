import { db } from '@/db/client'
import { transactions, budgets, categorizationFeedback } from '@/db/schema'
import { inArray } from 'drizzle-orm'

export async function mergeCategories(from: string[], to: string): Promise<number> {
  const updated = await db
    .update(transactions)
    .set({ category: to, updatedAt: new Date() })
    .where(inArray(transactions.category, from))
    .returning({ id: transactions.id })

  await db.delete(budgets).where(inArray(budgets.category, from))

  await db
    .update(categorizationFeedback)
    .set({ chosenCategory: to })
    .where(inArray(categorizationFeedback.chosenCategory, from))

  await db
    .update(categorizationFeedback)
    .set({ suggestedCategory: to })
    .where(inArray(categorizationFeedback.suggestedCategory, from))

  return updated.length
}
