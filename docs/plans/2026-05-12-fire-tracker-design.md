# FIRE Calculator/Tracker + Accounts Reconciliation — Design

## Context

Findash currently has Overview, Transactions, Spending, Investments, Budgets, Insights, and Settings pages. There is no view that answers "how close am I to financial independence, and when will I get there?" Goals:

1. A **FIRE tracker** (not just a calculator) that grounds its numbers in real transaction and investment data, while allowing manual overrides for what-if scenarios.
2. Support for **Classic FIRE (4% rule)** and **Coast FIRE** flavors.
3. An **expanded Accounts section** that holds per-account balances with **reconciliation**: derived balance (from transactions) vs manually-stamped snapshot, with a visible diff so missing/duplicated transactions become obvious.

Outcome: a `/fire` page with a real-data-backed FIRE projection, an Accounts area that doubles as a manual ledger reconciliation tool, and a small FIRE summary card on the Overview page.

## Schema changes (one Drizzle migration)

Extend `accounts` table in `src/db/schema.ts`:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `type` | text NOT NULL | `'cash'` | `cash` \| `brokerage` \| `credit` \| `loan` |
| `starting_balance` | numeric(14,2) NOT NULL | `0` | Balance at the starting date; anchors derivation |
| `starting_date` | date NOT NULL | `'1970-01-01'` | Date the starting balance applies from |
| `balance_snapshot` | numeric(14,2) NULL | — | Latest manual stamp |
| `snapshot_at` | timestamptz NULL | — | When the snapshot was taken |

FIRE assumptions reuse the existing `app_settings` table with `key = 'fire_settings'`, value shape:

```json
{
  "withdrawal_rate": 0.04,
  "real_return_rate": 0.07,
  "current_age": 30,
  "target_retirement_age": 50,
  "annual_expense_override": null,
  "monthly_contribution_override": null
}
```

Null override means "derive from transactions".

## Computation library — `src/lib/fire.ts` (new, pure functions)

- `computeDerivedBalance(account, transactions, holdings?, prices?): number`
  - For `cash`/`credit`/`loan`: `starting_balance + Σ txn.amount` where `txn.account == account.name` and `txn.date >= starting_date`.
  - For `brokerage`: above PLUS `Σ(holding.shares × current_price)` for tickers transacted under this account.
- `computeAccountReconciliation(account, transactions, holdings, prices) → { derived, snapshot, diff, snapshotAt }`
- `computePortfolioTotal(accounts, transactions, holdings, prices): number` — uses `balance_snapshot` when set, else derived; subtracts credit/loan balances.
- `computeAnnualExpenseDefault(transactions): number` — avg of last 3 full months of `type='expense'` × 12.
- `computeMonthlyContributionDefault(transactions): number` — sum of last 3 months of `type='investment'` outflows ÷ 3.
- `computeFireNumber(annualExpenses, withdrawalRate): number`.
- `computeYearsToFire(portfolio, monthlyContribution, fireNumber, realReturnRate) → { years, monthlySeries }` — monthly-compounded annuity formula; series capped at 60 years.
- `computeCoastFire(portfolio, fireNumber, currentAge, targetAge, realReturnRate) → { coastNumberToday, alreadyCoasting, coastAge, projectedAtTargetAge }`.

Reuses: `getInvestmentHoldings` from `src/lib/transactions.ts:70`, prices via existing `/api/investments/prices` flow.

## API routes

- `PUT /api/accounts/[id]` (new) — update account fields (type, starting balance/date, balance_snapshot, snapshot_at).
- `POST /api/accounts/[id]/snapshot` (new) — convenience: stamps `balance_snapshot = computed derived` at `now()`.
- `GET /api/fire-settings`, `PUT /api/fire-settings` (new) — load/save assumptions.

DB helpers in `src/db/queries/`: extend `accounts.ts` with `updateAccount(id, patch)`; new `fire-settings.ts` with `getFireSettings()`, `upsertFireSettings(value)`.

## Pages & components

**`/fire` page** (`src/app/(dashboard)/fire/`):
- `page.tsx` — server component. Fetches transactions, accounts, holdings, prices, `fire_settings`.
- `FireDashboard.tsx` — client. Stat cards (Portfolio / FIRE number / Years to FIRE / Coast status), projection chart, assumptions panel (sliders), override panel (annual expenses, monthly contribution with "use derived" reset link), Coast FIRE block. Debounced `PUT /api/fire-settings`.
- `ProjectionChart.tsx` — Recharts line chart with FIRE-number reference line.

**Settings → Accounts** (edit `AccountsSettings.tsx`): each card shows
```
[Name] · ••••[last4]                  [Type ▼]
Starting:  $X on YYYY-MM-DD
Derived:   $Y (N txns)
Manual:    $Z   stamped YYYY-MM-DD     ⚠ diff
[Stamp now]  [Edit]  [Delete]
```
Edit modal: type, starting balance, starting date. "Stamp now" → POSTs to the snapshot endpoint.

**Overview**: embed compact `FireSummaryCard` showing progress bar and years-to-FIRE.

**Nav**: add `/fire` entry to sidebar and bottom nav.

## Critical files

- `src/db/schema.ts` — add columns to `accounts`.
- New migration under `src/db/migrations/`.
- `src/db/queries/accounts.ts` — add `updateAccount`.
- `src/db/queries/fire-settings.ts` (new).
- `src/lib/fire.ts` (new).
- `src/app/api/accounts/[id]/route.ts` (new) — `PUT`.
- `src/app/api/accounts/[id]/snapshot/route.ts` (new) — `POST`.
- `src/app/api/fire-settings/route.ts` (new) — `GET`/`PUT`.
- `src/app/(dashboard)/fire/{page,FireDashboard,ProjectionChart}.tsx` (new).
- `src/components/dashboard/FireSummaryCard.tsx` (new).
- `src/app/(dashboard)/page.tsx` — embed summary card.
- `src/app/(dashboard)/settings/AccountsSettings.tsx` — expand UI.
- `src/components/layout/*` — add `/fire` link.

## Reused primitives

- `getInvestmentHoldings(transactions)` — `src/lib/transactions.ts:70`.
- `groupByMonth(transactions)` — `src/lib/transactions.ts:38`.
- `appSettings` table — `src/db/schema.ts:127`.
- `fetchJson` helper — `src/lib/fetch-json.ts`.
- `/api/investments/prices` route.
- iOS-card pattern from `AccountsSettings.tsx`.
- Recharts (already used by `CashFlowChart`).

## Verification

1. **Unit tests** (`src/test/lib/fire.test.ts`): formula correctness, edge cases (zero portfolio, already FIRE'd, brokerage with no holdings, snapshot null → diff null). `pnpm test:run`.
2. **Migration**: `pnpm db:generate` writes one SQL file. Apply with `pnpm db:migrate` (or `pnpm db:push` for dev). Existing rows get sane defaults (`type='cash'`, `starting_balance=0`).
3. **API smoke** via curl: `GET/PUT /api/fire-settings`, `PUT /api/accounts/[id]`, `POST /api/accounts/[id]/snapshot`.
4. **Manual E2E** with `pnpm dev`: Settings → account expand/edit/snapshot/reconciliation round-trip; `/fire` page renders and persists; Overview shows the FIRE card; mobile layout works.
5. **Type/lint**: `pnpm lint` clean.

## Out of scope for v1

- Historical net-worth chart (`account_snapshots` table).
- Barista FIRE.
- Inflation-adjusted vs nominal toggle (uses real return rate throughout).
- Multi-currency.

## Sequencing

1. **Phase 1** — schema + accounts queries + reconciliation lib + AccountsSettings UI.
2. **Phase 2** — FIRE math + `fire_settings` API + `/fire` page + nav.
3. **Phase 3** — `FireSummaryCard` on Overview.
