import {
  pgTable,
  text,
  uuid,
  timestamp,
  date,
  numeric,
  integer,
  boolean,
  jsonb,
  char,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    date: date('date').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    type: text('type').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    account: text('account').notNull(),
    ticker: text('ticker'),
    shares: numeric('shares', { precision: 14, scale: 6 }),
    pricePerShare: numeric('price_per_share', { precision: 14, scale: 4 }),
    source: text('source').notNull().default('manual'),
    sourceBatchId: uuid('source_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_transactions_date').on(t.date.desc()),
    index('idx_transactions_category').on(t.category),
    index('idx_transactions_type').on(t.type),
  ],
)

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    month: char('month', { length: 7 }),
    category: text('category').notNull(),
    capCents: integer('cap_cents').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_budgets_month_category').on(t.month, t.category),
    index('idx_budgets_month').on(t.month),
  ],
)

export const insights = pgTable(
  'insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    periodType: text('period_type').notNull(),
    periodKey: text('period_key').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    model: text('model').notNull(),
    narrative: text('narrative').notNull(),
    summaryJson: jsonb('summary_json').notNull(),
    inputHash: text('input_hash').notNull(),
  },
  (t) => [
    uniqueIndex('idx_insights_period').on(t.periodType, t.periodKey),
  ],
)

export const extractionBatches = pgTable(
  'extraction_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    fileRefs: jsonb('file_refs').notNull(),
    status: text('status').notNull().default('pending'),
    model: text('model'),
    rawResponse: jsonb('raw_response'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    committedAt: timestamp('committed_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_batches_status').on(t.status, t.createdAt.desc()),
  ],
)

export const pendingTransactions = pgTable(
  'pending_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => extractionBatches.id, { onDelete: 'cascade' }),
    draft: jsonb('draft').notNull(),
    suggestedCategory: text('suggested_category'),
    categoryConfidence: numeric('category_confidence', { precision: 3, scale: 2 }),
    duplicateOf: text('duplicate_of').references(() => transactions.id),
    userAction: text('user_action'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_pending_batch').on(t.batchId)],
)

export const categorizationFeedback = pgTable(
  'categorization_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    description: text('description').notNull(),
    merchantSlug: text('merchant_slug').notNull(),
    suggestedCategory: text('suggested_category').notNull(),
    chosenCategory: text('chosen_category').notNull(),
    accepted: boolean('accepted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_feedback_merchant').on(t.merchantSlug)],
)

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
})

export type TransactionRow = typeof transactions.$inferSelect
export type NewTransactionRow = typeof transactions.$inferInsert
export type BudgetRow = typeof budgets.$inferSelect
export type NewBudgetRow = typeof budgets.$inferInsert
export type InsightRow = typeof insights.$inferSelect
export type NewInsightRow = typeof insights.$inferInsert
export type ExtractionBatchRow = typeof extractionBatches.$inferSelect
export type PendingTransactionRow = typeof pendingTransactions.$inferSelect
export type CategorizationFeedbackRow = typeof categorizationFeedback.$inferSelect
