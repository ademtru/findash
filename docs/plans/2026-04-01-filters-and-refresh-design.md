# Filters, Refresh & Category Drill-down Design

**Date:** 2026-04-01

## Goal

Four features: (1) refresh button that re-fetches Blob data, (2) month picker grid replacing the arrow-only selector, (3) category filter on the Transactions page, (4) category drill-down from Spending → Transactions.

## Architecture

All filters live in the URL (`?month=`, `?category=`, `?type=`). Refresh uses `router.refresh()` — no API changes. Everything server-rendered via Next.js App Router searchParams.

---

## Feature 1: Refresh Button

**Component:** `src/components/dashboard/RefreshButton.tsx`

- Client component with `RotateCcw` icon from lucide-react
- Calls `router.refresh()` on click
- Shows spinning animation while refreshing, returns to normal after
- Placed top-right inside each page header `<div>` using `flex justify-between`
- Added to: Overview, Spending, Investments, Transactions, Insights pages

---

## Feature 2: Month Picker Grid

**Component:** `src/components/dashboard/MonthSelector.tsx` (redesigned)

The existing pill is kept but the month label becomes clickable, opening an absolutely-positioned dropdown:

**Grid layout:**
- Each row = one year (e.g. "2025", "2026")
- Each row has 12 columns: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
- Months in the `months` prop (have data) = full opacity, clickable
- Months not in the `months` prop = `opacity-30 pointer-events-none cursor-default`
- Selected month = cyan background highlight
- Clicking a month sets `?month=YYYY-MM` and closes the dropdown

**Behaviour:**
- Click month label to open, click outside or Escape to close
- Left/right arrows still work for quick prev/next
- "All time" button still clears the param

---

## Feature 3: Category Filter — Transactions Page

**New component:** `src/components/dashboard/CategoryFilter.tsx`

- Client component
- Receives `categories: string[]` (unique categories from month-filtered transactions) and `selectedCategory?: string`
- Renders horizontal chip row, same style as existing type filter chips
- Clicking a chip adds `?category=Groceries` to URL (preserving `?month=` and `?type=`)
- Active chip is cyan, has an `×` to clear
- Placed between MonthSelector and the search/type filters

**Transactions page (`src/app/(dashboard)/transactions/page.tsx`):**
- `searchParams` extended: `{ month?: string; category?: string; type?: string }`
- Type filter moves from client state to URL param (removes useState from TransactionsTable for type)
- Filter chain: `filterByMonth` → `filterByCategory` → `filterByType` (all server-side)
- Category list derived from month-filtered transactions (before category filter applied)
- "Filtered by [category] ×" badge shown in subtitle when category active

**`src/lib/transactions.ts`:**
```ts
export function filterByCategory(transactions: Transaction[], category?: string): Transaction[] {
  if (!category) return transactions
  return transactions.filter(t => t.category === category)
}

export function filterByType(transactions: Transaction[], type?: string): Transaction[] {
  if (!type || type === 'all') return transactions
  return transactions.filter(t => t.type === type)
}
```

**`src/components/dashboard/TransactionsTable.tsx`:**
- Remove `typeFilter` useState — type now controlled by URL via server
- Remove type filter button row from this component (moves to server-rendered page or CategoryFilter)
- Table becomes a pure display component: receives `transactions` and renders them

---

## Feature 4: Category Drill-down — Spending → Transactions

**Spending page (`src/app/(dashboard)/spending/page.tsx`):**
- Category table rows: wrap `<tr>` content in a `<Link href="/transactions?month=...&category=...">` with hover arrow indicator
- Must make the spending page aware of `searchParams.month` for the link (already does)

**SpendingDonut (`src/components/dashboard/SpendingDonut.tsx`):**
- Accept optional `onCategoryClick?: (category: string) => void` prop
- When provided, PieChart cells get `onClick` handler
- Spending page wraps donut in a client component that uses `useRouter` to navigate on click

**OR simpler:** Convert SpendingDonut to a client component, accept `month?: string` prop, handle navigation internally. Spending page passes `month` down.

Use the simpler approach: SpendingDonut becomes a client component with built-in `useRouter` navigation.

---

## URL param design

```
/transactions                                    → all time, all categories
/transactions?month=2026-03                      → March, all categories
/transactions?month=2026-03&category=Groceries   → March, Groceries only
/transactions?category=Groceries                 → all time, Groceries only
/transactions?type=expense                       → all time, expenses only (type from URL)
```

Spending → Transactions links always preserve the active `?month=` if one is selected.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/RefreshButton.tsx` | Create |
| `src/components/dashboard/CategoryFilter.tsx` | Create |
| `src/components/dashboard/MonthSelector.tsx` | Add grid dropdown |
| `src/components/dashboard/TransactionsTable.tsx` | Remove type filter state, pure display |
| `src/components/dashboard/SpendingDonut.tsx` | Add onClick navigation |
| `src/lib/transactions.ts` | Add filterByCategory, filterByType |
| `src/test/lib/transactions.test.ts` | Add tests for new utilities |
| `src/app/(dashboard)/page.tsx` | Add RefreshButton |
| `src/app/(dashboard)/transactions/page.tsx` | Add category+type searchParams, CategoryFilter |
| `src/app/(dashboard)/spending/page.tsx` | Add clickable rows, pass month to donut |
| `src/app/(dashboard)/investments/page.tsx` | Add RefreshButton |
| `src/app/(dashboard)/insights/page.tsx` | Add RefreshButton |
