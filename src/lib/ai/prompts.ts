export interface CategoryContextRow {
  merchantSlug: string
  chosenCategory: string
  acceptedCount: number
}

export interface CategoriseInput {
  description: string
  amount: number
  account: string
  activeCategories: string[]
  merchantHints: CategoryContextRow[]
}

function fmtAmount(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

export function buildCategorisePrompt(input: CategoriseInput): { system: string; user: string } {
  const catsBlock = input.activeCategories.length
    ? input.activeCategories.join(', ')
    : '(none yet — pick a reasonable fresh one)'

  const hintsBlock = input.merchantHints.length
    ? input.merchantHints
        .map((h) => `- "${h.merchantSlug}" → ${h.chosenCategory} (used ${h.acceptedCount}x)`)
        .join('\n')
    : '(no prior feedback yet)'

  const system =
    `You classify single personal-finance transactions into a category.
Respond with the most likely category, a confidence 0..1, and up to 3 alternates.
Prefer categories already in the user's active list unless none fit.
Be decisive — do not ask for more information.`

  const user =
    `<active_categories>
${catsBlock}
</active_categories>

<merchant_hints>
${hintsBlock}
</merchant_hints>

<transaction>
description: ${input.description}
amount: ${fmtAmount(input.amount)}
account: ${input.account}
</transaction>`

  return { system, user }
}

export interface ExtractPromptInput {
  assumeYear: number
  activeCategories: string[]
  sourceKind: 'screenshot' | 'pdf' | 'csv'
}

export function buildExtractPrompt(input: ExtractPromptInput): { system: string; user: string } {
  const cats = input.activeCategories.length
    ? input.activeCategories.join(', ')
    : '(empty — pick reasonable categories)'

  const kindHints = {
    screenshot:
      'This is a phone screenshot of a banking or credit-card app. Ignore UI chrome (tabs, buttons, balance totals). Only extract posted transactions that are clearly line items.',
    pdf: 'This is a bank statement. Ignore running balances, interest accrual summaries, and "statement totals". Extract only posted transactions.',
    csv: 'This is a CSV export. Treat each row as a transaction; skip header rows and any summary rows.',
  }[input.sourceKind]

  const system =
    `You extract personal-finance transactions from the attached image or document.

Output rules:
- Dates use YYYY-MM-DD. If the year is missing, assume ${input.assumeYear}.
- Amounts: negative for money leaving the account, positive for money coming in. Never output an absolute value with a separate sign flag — sign lives in the amount.
- Pick the category from <active_categories> when one fits. Otherwise, pick a reasonable new category (title case).
- Type must be one of: income, expense, transfer, investment.
- For the account field, always output "Main" — we don't track separate accounts.
- ${kindHints}
- If a transaction is unclear, include it with a low confidence (0.3-0.6) and add a short notes string.
- If anything odd happens (cropped image, illegible row, mixed currencies), add an entry to warnings — do not invent data.
- Do not include duplicates of the same visible row.
- Be decisive. Do not ask questions or defer.`

  const user =
    `<active_categories>
${cats}
</active_categories>

<assume_year>${input.assumeYear}</assume_year>

Extract every posted transaction visible.`

  return { system, user }
}

export interface InsightBudget {
  category: string
  capCents: number
}

export interface InsightPromptInput {
  kind: 'weekly' | 'monthly'
  periodKey: string
  periodStart: string
  periodEnd: string
  referenceLabel: string // e.g. "prior 4 weeks" or "trailing 6 months"
  totals: {
    income: number
    expenses: number
    net: number
    byCategory: Array<{ category: string; amount: number; priorAverage: number }>
  }
  referenceTotals: { income: number; expenses: number; net: number }
  budgets: InsightBudget[]
  topTransactions: Array<{ date: string; amount: number; description: string; category: string }>
  investmentHoldings?: Array<{ ticker: string; shares: number; cost: number }>
}

export function buildInsightPrompt(input: InsightPromptInput): { system: string; user: string } {
  const catLines = input.totals.byCategory
    .slice(0, 20)
    .map((c) => {
      const delta = c.priorAverage > 0 ? ((c.amount - c.priorAverage) / c.priorAverage) * 100 : 0
      const sign = delta > 0 ? '+' : ''
      return `- ${c.category}: $${c.amount.toFixed(0)} (${sign}${delta.toFixed(0)}% vs avg $${c.priorAverage.toFixed(0)})`
    })
    .join('\n')

  const budgetLines = input.budgets.length
    ? input.budgets.map((b) => `- ${b.category}: $${(b.capCents / 100).toFixed(0)} cap`).join('\n')
    : '(no budgets set)'

  const topTxnLines = input.topTransactions
    .slice(0, 10)
    .map((t) => `- ${t.date} · $${Math.abs(t.amount).toFixed(2)} · ${t.description} [${t.category}]`)
    .join('\n')

  const investBlock =
    input.kind === 'monthly' && input.investmentHoldings && input.investmentHoldings.length > 0
      ? `\n<investments>\n${input.investmentHoldings
          .map((h) => `- ${h.ticker}: ${h.shares.toFixed(4)} shares, cost $${h.cost.toFixed(0)}`)
          .join('\n')}\n</investments>`
      : ''

  const system =
    `You write concise, specific financial insights for a personal-finance dashboard. The user reviews their own money — do not be patronising. Never hedge with "consider" or "you might want to". Say what happened and why it matters.

Output rules:
- Narrative: 2–4 short paragraphs of plain prose. No headings, no bullet lists, no markdown emphasis. Reference specific categories and amounts.
- savings_rate: (income - outflows) / income, as a decimal. If income is 0, use 0.
- highlights: 2–5 short strings, each one fact (e.g. "Groceries were $480, up 38% vs the 4-week average").
- anomalies: 0–5 entries for transactions or category jumps that stand out. Use severity honestly; most weeks should have 0–1 highs.
- trends: 0–4 observations about direction — which categories are increasing or decreasing. direction must be 'positive', 'negative', or 'neutral' from a savings perspective (spending going up = negative).
${input.kind === 'monthly' ? '- investments: one entry per ticker with a one-sentence note about the position.\n' : ''}
Do not invent data. If a category is empty, don't mention it.`

  const user =
    `<period>
kind: ${input.kind}
key: ${input.periodKey}
range: ${input.periodStart} to ${input.periodEnd}
reference: ${input.referenceLabel}
</period>

<totals>
income: $${input.totals.income.toFixed(0)}
expenses: $${input.totals.expenses.toFixed(0)}
net: $${input.totals.net.toFixed(0)}
reference_avg_income: $${input.referenceTotals.income.toFixed(0)}
reference_avg_expenses: $${input.referenceTotals.expenses.toFixed(0)}
reference_avg_net: $${input.referenceTotals.net.toFixed(0)}
</totals>

<category_spend>
${catLines || '(none)'}
</category_spend>

<budgets>
${budgetLines}
</budgets>

<top_transactions>
${topTxnLines || '(none)'}
</top_transactions>${investBlock}

Write insights for this ${input.kind} period.`

  return { system, user }
}
