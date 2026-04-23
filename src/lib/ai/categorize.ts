import { generateObject } from 'ai'
import { db } from '@/db/client'
import { categorizationFeedback, transactions } from '@/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { MODELS } from './gateway'
import { CategorySuggestionSchema, type CategorySuggestion } from './schemas'
import { buildCategorisePrompt, type CategoryContextRow } from './prompts'
import { merchantSlug } from '@/lib/transactions/id'

const MAX_HINTS = 8
const MAX_ACTIVE_CATEGORIES = 40

async function loadActiveCategories(): Promise<string[]> {
  const rows = await db
    .select({ category: transactions.category, c: sql<number>`count(*)::int` })
    .from(transactions)
    .groupBy(transactions.category)
    .orderBy(sql`count(*) desc`)
    .limit(MAX_ACTIVE_CATEGORIES)
  return rows.map((r) => r.category)
}

async function loadMerchantHints(description: string): Promise<CategoryContextRow[]> {
  const slug = merchantSlug(description)
  if (slug === 'unknown') return []
  const rows = await db
    .select({
      merchantSlug: categorizationFeedback.merchantSlug,
      chosenCategory: categorizationFeedback.chosenCategory,
      c: sql<number>`count(*) filter (where ${categorizationFeedback.accepted})::int`,
    })
    .from(categorizationFeedback)
    .where(eq(categorizationFeedback.merchantSlug, slug))
    .groupBy(categorizationFeedback.merchantSlug, categorizationFeedback.chosenCategory)
    .orderBy(desc(sql`count(*)`))
    .limit(MAX_HINTS)
  return rows.map((r) => ({
    merchantSlug: r.merchantSlug,
    chosenCategory: r.chosenCategory,
    acceptedCount: r.c,
  }))
}

export interface CategoriseArgs {
  description: string
  amount: number
  account: string
}

export async function suggestCategory(args: CategoriseArgs): Promise<CategorySuggestion> {
  const [activeCategories, merchantHints] = await Promise.all([
    loadActiveCategories(),
    loadMerchantHints(args.description),
  ])

  const { system, user } = buildCategorisePrompt({ ...args, activeCategories, merchantHints })

  const { object } = await generateObject({
    model: MODELS.categorize,
    schema: CategorySuggestionSchema,
    system,
    prompt: user,
    temperature: 0,
  })
  return object
}
