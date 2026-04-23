export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment'

export type TransactionSource = 'manual' | 'screenshot' | 'pdf' | 'csv' | 'migrated'

export interface Transaction {
  id: string
  date: string // ISO date string YYYY-MM-DD
  amount: number // negative = out, positive = in
  type: TransactionType
  category: string
  description: string
  account: string
  ticker?: string | null
  shares?: number | null
  price_per_share?: number | null
  source?: TransactionSource
}

export interface TransactionData {
  transactions: Transaction[]
}

export interface MonthlyInsight {
  month: string // YYYY-MM
  narrative: string
  savings_rate: number
  highlights: string[]
}

export interface Anomaly {
  date: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface Trend {
  type: string
  description: string
  direction: 'positive' | 'negative' | 'neutral'
}

export interface InvestmentInsight {
  ticker: string
  commentary: string
}

export interface InsightsData {
  generated_at: string
  monthly: MonthlyInsight[]
  anomalies: Anomaly[]
  trends: Trend[]
  investments: InvestmentInsight[]
}
