import { db } from '@/db/client'
import { appSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_FIRE_SETTINGS, type FireSettings } from '@/lib/fire'

const KEY = 'fire_settings'

export async function getFireSettings(): Promise<FireSettings> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, KEY))
    .limit(1)
  if (!row) return DEFAULT_FIRE_SETTINGS
  const v = row.value as Partial<FireSettings>
  return {
    withdrawalRate: v.withdrawalRate ?? DEFAULT_FIRE_SETTINGS.withdrawalRate,
    realReturnRate: v.realReturnRate ?? DEFAULT_FIRE_SETTINGS.realReturnRate,
    currentAge: v.currentAge ?? DEFAULT_FIRE_SETTINGS.currentAge,
    targetRetirementAge: v.targetRetirementAge ?? DEFAULT_FIRE_SETTINGS.targetRetirementAge,
    annualExpenseOverride: v.annualExpenseOverride ?? null,
    monthlyContributionOverride: v.monthlyContributionOverride ?? null,
  }
}

export async function upsertFireSettings(settings: FireSettings): Promise<FireSettings> {
  await db
    .insert(appSettings)
    .values({ key: KEY, value: settings })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: settings },
    })
  return settings
}
