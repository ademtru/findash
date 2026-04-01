# Monthly View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `?month=YYYY-MM` URL param to Overview, Spending, Investments, and Transactions pages so the user can filter any page to a specific month, with "All time" as the default.

**Architecture:** A shared `MonthSelector` client component reads `useSearchParams()` for the current month and updates the URL via `router.push()`. Each server-side page receives `searchParams` as a prop (Next.js 16 async pattern — must be awaited), calls `filterByMonth(transactions, month)` before computing any stats, then passes the filtered data to charts and tables. The `MonthSelector` receives the list of available months as a prop from the server component.

**Tech Stack:** Next.js 16 App Router, TypeScript, `next/navigation` (`useRouter`, `useSearchParams`), `date-fns`, Vitest

---

## Task 1: Add `filterByMonth` utility + tests

**Files:**
- Modify: `src/lib/transactions.ts`
- Modify: `src/test/lib/transactions.test.ts`

**Step 1: Write failing test**

Add to `src/test/lib/transactions.test.ts`:

```ts
import {
  getTotalIncome, getTotalExpenses, getNetCashFlow,
  getSavingsRate, groupByCategory, groupByMonth,
  getNetWorth, filterByMonth,
} from '@/lib/transactions'

// Add inside describe('transactions utils', ...):

it('filterByMonth returns all when no month given', () => {
  expect(filterByMonth(sample, undefined)).toHaveLength(5)
})

it('filterByMonth returns only matching month', () => {
  const result = filterByMonth(sample, '2025-03')
  expect(result).toHaveLength(3)
  expect(result.every(t => t.date.startsWith('2025-03'))).toBe(true)
})

it('filterByMonth returns empty for unknown month', () => {
  expect(filterByMonth(sample, '2024-01')).toHaveLength(0)
})
```

**Step 2: Run — expect FAIL**

```bash
pnpm test:run src/test/lib/transactions.test.ts
```
Expected: FAIL — `filterByMonth is not exported`

**Step 3: Implement**

Add to the bottom of `src/lib/transactions.ts`:

```ts
export function filterByMonth(transactions: Transaction[], month?: string): Transaction[] {
  if (!month) return transactions
  return transactions.filter(t => t.date.startsWith(month))
}
```

**Step 4: Run — expect PASS**

```bash
pnpm test:run src/test/lib/transactions.test.ts
```
Expected: all tests pass

**Step 5: Commit**

```bash
git add src/lib/transactions.ts src/test/lib/transactions.test.ts
git commit -m "feat: add filterByMonth utility"
```

---

## Task 2: Create `MonthSelector` component

**Files:**
- Create: `src/components/dashboard/MonthSelector.tsx`

**Step 1: Create component**

Create `src/components/dashboard/MonthSelector.tsx`:

```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  months: string[] // YYYY-MM strings, sorted newest first
}

export function MonthSelector({ months }: MonthSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get('month') ?? undefined

  const currentIdx = selectedMonth ? months.indexOf(selectedMonth) : -1

  function navigate(month: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (month) params.set('month', month)
    else params.delete('month')
    router.push(`?${params.toString()}`)
  }

  const canGoOlder = selectedMonth ? currentIdx < months.length - 1 : months.length > 0
  const canGoNewer = selectedMonth ? currentIdx > 0 : false

  return (
    <div className="flex items-center justify-between glass rounded-2xl px-5 py-3.5">
      <button
        onClick={() => navigate(null)}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
          !selectedMonth
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
            : 'text-slate-500 hover:text-slate-300 border border-transparent'
        }`}
      >
        All time
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(selectedMonth ? months[currentIdx + 1] : months[0])}
          disabled={!canGoOlder}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-default"
        >
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </button>

        <p className="text-sm font-semibold text-white min-w-[130px] text-center">
          {selectedMonth
            ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
            : 'All time'}
        </p>

        <button
          onClick={() => canGoNewer ? navigate(months[currentIdx - 1]) : undefined}
          disabled={!canGoNewer}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-default"
        >
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <div className="w-20" />
    </div>
  )
}
```

**Step 2: Verify build**

```bash
pnpm build
```
Expected: compiles with no errors

**Step 3: Commit**

```bash
git add src/components/dashboard/MonthSelector.tsx
git commit -m "feat: add MonthSelector component"
```

---

## Task 3: Update Overview page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: Rewrite page**

Replace `src/app/(dashboard)/page.tsx` with:

```tsx
import { StatCard } from '@/components/dashboard/StatCard'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import {
  getTotalIncome, getTotalExpenses, getNetWorth,
  getSavingsRate, groupByCategory, groupByMonth, filterByMonth,
} from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  // Sorted month list for the selector (newest first)
  const months = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  const filtered = filterByMonth(transactions, month)

  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)
  const savingsRate = getSavingsRate(filtered)

  // All-time: show net worth. Monthly: show net cash flow for that month.
  const primaryValue = month
    ? `$${(income - expenses).toLocaleString()}`
    : `$${getNetWorth(transactions).toLocaleString()}`
  const primaryTitle = month ? 'Net Cash Flow' : 'Net Worth'

  const byMonth = groupByMonth(filtered)
  const cashFlowData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, txns]) => ({
      month: format(parseISO(`${m}-01`), 'MMM yy'),
      income: getTotalIncome(txns),
      expenses: getTotalExpenses(txns),
    }))

  const categoryData = Object.entries(groupByCategory(filtered.filter(t => t.type === 'expense')))
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Financial snapshot</p>
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title={primaryTitle} value={primaryValue} accent="cyan" />
        <StatCard title="Total Income" value={`$${income.toLocaleString()}`} trend="up" accent="emerald" />
        <StatCard title="Total Expenses" value={`$${expenses.toLocaleString()}`} trend="down" />
        <StatCard title="Savings Rate" value={`${(savingsRate * 100).toFixed(1)}%`} trend={savingsRate > 0.2 ? 'up' : 'neutral'} accent="violet" />
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <CashFlowChart data={cashFlowData} />
        <SpendingDonut data={categoryData} />
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

```bash
pnpm build
```
Expected: no errors

**Step 3: Smoke test**

```bash
pnpm dev
```
- Visit http://localhost:3000 — MonthSelector visible, all-time stats shown
- Click ← to select a month — URL changes to `/?month=2026-03`, stats update
- Click "All time" — URL param cleared, net worth returns

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: add monthly filter to overview page"
```

---

## Task 4: Update Spending page

**Files:**
- Modify: `src/app/(dashboard)/spending/page.tsx`

**Step 1: Rewrite page**

Replace `src/app/(dashboard)/spending/page.tsx` with:

```tsx
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { SpendingTrends } from '@/components/dashboard/SpendingTrends'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { groupByCategory, groupByMonth, getTotalExpenses, filterByMonth } from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  const filtered = filterByMonth(transactions, month)
  const expenses = filtered.filter(t => t.type === 'expense')

  const byCategory = groupByCategory(expenses)
  const categoryData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topCategories = categoryData.slice(0, 5).map(c => c.category)

  const byMonth = groupByMonth(expenses)
  const trendData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, txns]) => {
      const byCat = groupByCategory(txns)
      return {
        month: format(parseISO(`${m}-01`), 'MMM yy'),
        ...Object.fromEntries(topCategories.map(cat => [cat, byCat[cat] ?? 0])),
      }
    })

  const totalSpend = getTotalExpenses(expenses)
  const monthCount = Math.max(Object.keys(groupByMonth(transactions.filter(t => t.type === 'expense'))).length, 1)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Spending</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Breakdown by category and time</p>
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Spent" value={`$${totalSpend.toLocaleString()}`} trend="down" />
        <StatCard title="Top Category" value={categoryData[0]?.category ?? '—'} />
        {!month && (
          <StatCard title="Avg / Month" value={`$${(totalSpend / monthCount).toFixed(0)}`} />
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <SpendingDonut data={categoryData.slice(0, 6)} />
        <SpendingTrends data={trendData} categories={topCategories} />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Total</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">% of Spend</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(({ category, amount }, i) => (
              <tr key={category} className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i === categoryData.length - 1 ? 'border-0' : ''}`}>
                <td className="px-5 py-3.5 font-medium text-slate-300">{category}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-white font-medium">${amount.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
                  {totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: Build + commit**

```bash
pnpm build
git add src/app/\(dashboard\)/spending/page.tsx
git commit -m "feat: add monthly filter to spending page"
```

---

## Task 5: Update Investments page

**Files:**
- Modify: `src/app/(dashboard)/investments/page.tsx`

**Step 1: Rewrite page**

Replace `src/app/(dashboard)/investments/page.tsx` with:

```tsx
import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { getInvestmentHoldings, filterByMonth } from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  // Holdings are always all-time (cumulative cost basis)
  const holdings = getInvestmentHoldings(transactions)
  const totalInvested = holdings.reduce((sum, h) => sum + h.cost, 0)

  // Monthly invested = investment transactions in the selected month only
  const monthlyInvested = month
    ? filterByMonth(transactions, month)
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    : null

  const allocationData = holdings.map(h => ({ category: h.ticker, amount: h.cost }))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Investments</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Portfolio holdings and allocation</p>
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Invested" value={`$${totalInvested.toLocaleString()}`} trend="up" />
        <StatCard title="Holdings" value={`${holdings.length}`} />
        {monthlyInvested !== null
          ? <StatCard title="Invested This Month" value={`$${monthlyInvested.toLocaleString()}`} accent="violet" />
          : <StatCard title="Largest Position" value={holdings[0]?.ticker ?? '—'} />
        }
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <SpendingDonut data={allocationData} />
        <div className="flex flex-col justify-start">
          <HoldingsTable holdings={holdings} />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Build + commit**

```bash
pnpm build
git add src/app/\(dashboard\)/investments/page.tsx
git commit -m "feat: add monthly filter to investments page"
```

---

## Task 6: Update Transactions page

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`
- Modify: `src/components/dashboard/TransactionsTable.tsx`

**Step 1: Remove month state from TransactionsTable**

The table no longer needs to manage month state — it just shows the transactions it receives. Remove the month navigator (the glass pill with ← →), the `months` derivation, the `monthIdx` state, the `monthIncome`/`monthExpenses` memos, and the month filter from the `filtered` memo. Keep search and type filter.

Replace `src/components/dashboard/TransactionsTable.tsx` with:

```tsx
'use client'
import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Search } from 'lucide-react'
import type { Transaction } from '@/types/transaction'

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  income:     { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  expense:    { color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  investment: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  transfer:   { color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
}

const TYPES = ['all', 'income', 'expense', 'investment', 'transfer']

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => transactions
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, search, typeFilter]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative sm:max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(type => (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize cursor-pointer ${
                typeFilter === type
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10'
              }`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:block glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Description</th>
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}>
                <td className="px-5 py-3.5 text-xs text-slate-500 tabular-nums">{format(parseISO(t.date), 'MMM d, yyyy')}</td>
                <td className="px-5 py-3.5 text-sm text-slate-200 font-medium">{t.description}</td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{t.category}</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: TYPE_CONFIG[t.type]?.color, background: TYPE_CONFIG[t.type]?.bg }}>
                    {t.type}
                  </span>
                </td>
                <td className={`px-5 py-3.5 text-right font-semibold tabular-nums text-sm ${t.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-600 text-sm">No transactions found</div>
        )}
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map(t => (
          <div key={t.id} className="glass rounded-xl px-4 py-3.5 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{t.description}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.category} · {format(parseISO(t.date), 'MMM d')}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${t.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
              </p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ color: TYPE_CONFIG[t.type]?.color, background: TYPE_CONFIG[t.type]?.bg }}>
                {t.type}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No transactions found</div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Update transactions page to use searchParams + MonthSelector**

Replace `src/app/(dashboard)/transactions/page.tsx` with:

```tsx
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { filterByMonth, getTotalIncome, getTotalExpenses } from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  const filtered = filterByMonth(transactions, month)
  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
          {month
            ? `${filtered.length} transactions · +$${income.toLocaleString()} · -$${expenses.toLocaleString()}`
            : `${transactions.length} transactions total`}
        </p>
      </div>
      <MonthSelector months={months} />
      <TransactionsTable transactions={filtered} />
    </div>
  )
}
```

**Step 3: Build + verify**

```bash
pnpm build
```
Expected: no errors

**Step 4: Smoke test**

```bash
pnpm dev
```
- Visit http://localhost:3000/transactions
- MonthSelector shows at top, defaults to all time
- Click ← — URL becomes `/transactions?month=2026-03`, table shows only March transactions
- Navigate to Overview — URL becomes `/?month=2026-03` (month preserved in nav)
- Click "All time" on Overview — clears param

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/transactions/page.tsx src/components/dashboard/TransactionsTable.tsx
git commit -m "feat: add monthly filter to transactions page, replace local state with URL param"
```

---

## Task 7: Final build check

**Step 1: Run all tests**

```bash
pnpm test:run
```
Expected: all passing

**Step 2: Production build**

```bash
pnpm build
```
Expected: clean build, all dashboard pages show as `ƒ (Dynamic)`

**Step 3: Commit if anything left unstaged**

```bash
git status
```
