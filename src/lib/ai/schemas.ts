import { z } from 'zod'

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer', 'investment'] as const

export const CategorySuggestionSchema = z.object({
  category: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(400),
  alternates: z
    .array(z.string().min(1).max(80))
    .max(3)
    .default([]),
})
export type CategorySuggestion = z.infer<typeof CategorySuggestionSchema>

export const ExtractedTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number(),
  type: z.enum(TRANSACTION_TYPES),
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  account: z.string().min(1).max(120),
  ticker: z.string().nullable().optional(),
  shares: z.number().nullable().optional(),
  price_per_share: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(400).optional(),
})
export type ExtractedTransaction = z.infer<typeof ExtractedTransactionSchema>

export const ExtractionBatchSchema = z.object({
  source_description: z.string().max(400),
  transactions: z.array(ExtractedTransactionSchema),
  warnings: z.array(z.string().max(400)).default([]),
})
export type ExtractionBatch = z.infer<typeof ExtractionBatchSchema>

export const AnomalySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(200),
  severity: z.enum(['low', 'medium', 'high']),
})

export const TrendSchema = z.object({
  type: z.string().max(60),
  description: z.string().max(300),
  direction: z.enum(['positive', 'negative', 'neutral']),
})

export const InvestmentCommentarySchema = z.object({
  ticker: z.string().max(20),
  commentary: z.string().max(400),
})

export const WeeklyInsightSchema = z.object({
  narrative: z.string().min(20).max(2000),
  savings_rate: z.number(),
  highlights: z.array(z.string().max(300)).max(6),
  anomalies: z.array(AnomalySchema).max(8).default([]),
  trends: z.array(TrendSchema).max(6).default([]),
})
export type WeeklyInsight = z.infer<typeof WeeklyInsightSchema>

export const MonthlyInsightSchema = z.object({
  narrative: z.string().min(20).max(3000),
  savings_rate: z.number(),
  highlights: z.array(z.string().max(300)).max(8),
  anomalies: z.array(AnomalySchema).max(10).default([]),
  trends: z.array(TrendSchema).max(8).default([]),
  investments: z.array(InvestmentCommentarySchema).max(12).default([]),
})
export type MonthlyInsight = z.infer<typeof MonthlyInsightSchema>
