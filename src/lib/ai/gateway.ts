import { google } from '@ai-sdk/google'

export const MODELS = {
  categorize: 'anthropic/claude-haiku-4.5',
  extractImage: google('gemini-2.0-flash'),
  extractCsv: google('gemini-2.0-flash'),
  weeklyInsight: 'anthropic/claude-sonnet-4.6',
  monthlyInsight: 'anthropic/claude-sonnet-4.6',
} as const

export type ModelKey = keyof typeof MODELS
