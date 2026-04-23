export const MODELS = {
  categorize: 'anthropic/claude-haiku-4.5',
  extractImage: 'anthropic/claude-sonnet-4.6',
  extractCsv: 'anthropic/claude-haiku-4.5',
  weeklyInsight: 'anthropic/claude-sonnet-4.6',
  monthlyInsight: 'anthropic/claude-sonnet-4.6',
} as const

export type ModelKey = keyof typeof MODELS
