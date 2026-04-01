# Monthly View Design

**Date:** 2026-04-01

## Goal

Add a per-month filter to Overview, Spending, Investments, and Transactions pages. The current all-time views are preserved — monthly filtering is additive.

## Architecture

The selected month lives in the URL as `?month=2026-03`. No client-side state, no context. A shared `MonthSelector` client component updates the URL via `router.push()`. Each page reads `searchParams.month` as a Next.js server component prop and filters transactions before computing any stats or charts.

**Default (no `?month` param):** all-time view — current behaviour unchanged.

## URL Pattern

```
/                        → all-time overview
/?month=2026-03          → overview for March 2026
/spending?month=2026-03  → spending for March 2026
/investments?month=2026-03
/transactions?month=2026-03
```

## Components

### New: `MonthSelector`

- Client component, placed below the page header on each affected page
- Glass pill with `←` / `→` arrows and centred month name
- "All time" button on the left clears the param
- Derives available months from the transaction list passed as a prop
- Updates URL with `router.push(?month=YYYY-MM)` on navigation

### Updated: `filterByMonth(transactions, month?)`

Utility in `src/lib/transactions.ts`. Returns all transactions when `month` is undefined, otherwise filters to `date.startsWith(month)`.

## Per-Page Changes

### Overview (`/`)
- Pass `searchParams.month` → filter transactions → recompute all stats
- All-time: Net Worth, Income, Expenses, Savings Rate + 6-month cash flow chart + spending donut
- Monthly: Net Cash Flow (replaces Net Worth — not meaningful for a single month), Income, Expenses, Savings Rate + daily/weekly cash flow for the month + spending donut for the month

### Spending (`/spending`)
- Filter expenses to month before all category aggregation
- Hide "Avg / Month" stat when a specific month is selected (redundant)
- Trend chart shows only the selected month's data when filtered

### Investments (`/investments`)
- Holdings table stays all-time (cost basis is cumulative)
- Add "Invested this month" stat card showing total investment transactions in the selected month
- Allocation donut stays all-time

### Transactions (`/transactions`)
- Replace current `useState`-based month navigator with `MonthSelector` (URL-driven)
- Behaviour identical, just synced via URL now

## Shared Utility

```ts
// src/lib/transactions.ts
export function filterByMonth(transactions: Transaction[], month?: string): Transaction[] {
  if (!month) return transactions
  return transactions.filter(t => t.date.startsWith(month))
}
```
