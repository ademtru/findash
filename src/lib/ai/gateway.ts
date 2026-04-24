import { google } from '@ai-sdk/google'

export const EXTRACTION_MODEL_ID = 'gemini-2.5-flash'

export const MODELS = {
  categorize: 'anthropic/claude-haiku-4.5',
  extractImage: google(EXTRACTION_MODEL_ID),
  extractCsv: google(EXTRACTION_MODEL_ID),
  weeklyInsight: 'anthropic/claude-sonnet-4.6',
  monthlyInsight: 'anthropic/claude-sonnet-4.6',
} as const

export type ModelKey = keyof typeof MODELS
