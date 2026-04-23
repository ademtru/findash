import { db } from '@/db/client'
import { insights, type InsightRow, type NewInsightRow } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'

export type Period = 'weekly' | 'monthly'

export async function listInsights(type: Period, limit = 24): Promise<InsightRow[]> {
  return db
    .select()
    .from(insights)
    .where(eq(insights.periodType, type))
    .orderBy(desc(insights.periodKey))
    .limit(limit)
}

export async function getInsightByPeriod(
  type: Period,
  key: string,
): Promise<InsightRow | null> {
  const rows = await db
    .select()
    .from(insights)
    .where(and(eq(insights.periodType, type), eq(insights.periodKey, key)))
    .limit(1)
  return rows[0] ?? null
}

export async function upsertInsight(input: NewInsightRow): Promise<InsightRow> {
  const [row] = await db
    .insert(insights)
    .values({ ...input, generatedAt: new Date() })
    .onConflictDoUpdate({
      target: [insights.periodType, insights.periodKey],
      set: {
        model: input.model,
        narrative: input.narrative,
        summaryJson: input.summaryJson,
        inputHash: input.inputHash,
        generatedAt: new Date(),
      },
    })
    .returning()
  return row
}
