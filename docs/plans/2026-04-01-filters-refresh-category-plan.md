# Filters, Refresh & Category Drill-down Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add refresh button, month picker grid dropdown, category filter chips, and category drill-down navigation from Spending → Transactions.

**Architecture:** All filters live in the URL (`?month=`, `?category=`, `?type=`). Refresh uses `router.refresh()`. Everything server-rendered via Next.js App Router searchParams. SpendingDonut becomes a client component that navigates on category click.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, lucide-react, recharts

**Design reference:** `docs/plans/2026-04-01-filters-and-refresh-design.md`

---

## Task 1: Transaction Utilities — filterByCategory + filterByType

**Files:**
- Modify: `src/lib/transactions.ts`
- Modify: `src/test/lib/transactions.test.ts`

### Step 1: Write failing tests

Add to the bottom of the `describe` block in `src/test/lib/transactions.test.ts`:

```ts
  it('filterByCategory returns all when no category given', () => {
    expect(filterByCategory(sample, undefined)).toHaveLength(5)
  })

  it('filterByCategory returns only matching category', () => {
    const result = filterByCategory(sample, 'Salary')
    expect(result).toHaveLength(2)
    expect(result.every(t => t.category === 'Salary')).toBe(true)
  })

  it('filterByCategory returns empty for unknown category', () => {
    expect(filterByCategory(sample, 'Unknown')).toHaveLength(0)
  })

  it('filterByType returns all when no type given', () => {
    expect(filterByType(sample, undefined)).toHaveLength(5)
  })

  it('filterByType returns all when type is "all"', () => {
    expect(filterByType(sample, 'all')).toHaveLength(5)
  })

  it('filterByType returns only matching type', () => {
    const result = filterByType(sample, 'income')
    expect(result).toHaveLength(2)
    expect(result.every(t => t.type === 'income')).toBe(true)
  })
```

Also update the import at the top of `src/test/lib/transactions.test.ts` to include the two new functions:

```ts
import {
  getTotalIncome,
  getTotalExpenses,
  getNetCashFlow,
  getSavingsRate,
  groupByCategory,
  groupByMonth,
  getNetWorth,
  filterByMonth,
  getAvailableMonths,
  filterByCategory,
  filterByType,
} from '@/lib/transactions'
```

### Step 2: Run tests — expect FAIL

```bash
pnpm test:run src/test/lib/transactions.test.ts
```

Expected: FAIL — `filterByCategory is not a function`

### Step 3: Add the two functions to `src/lib/transactions.ts`

Append after `filterByMonth` (line 58):

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

### Step 4: Run tests — expect PASS

```bash
pnpm test:run src/test/lib/transactions.test.ts
```

Expected: All tests passing (existing 13 + 6 new = 19)

### Step 5: Commit

```bash
git add src/lib/transactions.ts src/test/lib/transactions.test.ts
git commit -m "feat: add filterByCategory and filterByType utilities"
```

---

## Task 2: RefreshButton Component

**Files:**
- Create: `src/components/dashboard/RefreshButton.tsx`

### Step 1: Create the component

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    // Reset after animation completes
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <button
      onClick={handleRefresh}
      className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
      aria-label="Refresh data"
    >
      <RotateCcw className={`h-4 w-4 text-slate-400 hover:text-slate-200 transition-colors ${spinning ? 'animate-spin' : ''}`} />
    </button>
  )
}
```

### Step 2: Commit

```bash
git add src/components/dashboard/RefreshButton.tsx
git commit -m "feat: add RefreshButton component with spin animation"
```

---

## Task 3: MonthSelector — Grid Dropdown Redesign

**Files:**
- Modify: `src/components/dashboard/MonthSelector.tsx`

The current MonthSelector (67 lines) needs a grid dropdown added. The month label in the center becomes clickable, opening an absolutely-positioned overlay with year rows and 12 month columns.

### Step 1: Replace `src/components/dashboard/MonthSelector.tsx` entirely

```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface MonthSelectorProps {
  months: string[] // YYYY-MM strings, sorted newest first (have data)
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthSelector({ months }: MonthSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get('month') || undefined
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentIdx = selectedMonth ? months.indexOf(selectedMonth) : -1

  function navigate(month: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (month) params.set('month', month)
    else params.delete('month')
    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open])

  const canGoOlder = selectedMonth ? currentIdx < months.length - 1 : months.length > 0
  const canGoNewer = selectedMonth ? currentIdx > 0 : false

  // Group months by year for the grid
  const yearMap: Record<string, Set<number>> = {}
  for (const m of months) {
    const [year, monthNum] = m.split('-')
    if (!yearMap[year]) yearMap[year] = new Set()
    yearMap[year].add(parseInt(monthNum))
  }
  const years = Object.keys(yearMap).sort((a, b) => b.localeCompare(a))

  return (
    <div ref={containerRef} className="relative">
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

          <button
            onClick={() => setOpen(v => !v)}
            className="text-sm font-semibold text-white min-w-[130px] text-center hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {selectedMonth
              ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
              : 'All time'}
          </button>

          <button
            onClick={() => { if (canGoNewer) navigate(months[currentIdx - 1]) }}
            disabled={!canGoNewer}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="w-20" />
      </div>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 glass rounded-2xl p-4 border border-white/10 shadow-2xl min-w-[340px]">
          {years.map(year => (
            <div key={year} className="mb-3 last:mb-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{year}</p>
              <div className="grid grid-cols-6 gap-1">
                {MONTH_LABELS.map((label, idx) => {
                  const monthNum = idx + 1
                  const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`
                  const hasData = yearMap[year]?.has(monthNum)
                  const isSelected = selectedMonth === monthStr

                  return (
                    <button
                      key={label}
                      onClick={() => hasData && navigate(monthStr)}
                      disabled={!hasData}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-default ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : hasData
                            ? 'text-slate-300 hover:bg-white/[0.08] hover:text-white border border-transparent'
                            : 'text-slate-700 opacity-30 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Step 2: Verify build compiles

```bash
pnpm build 2>&1 | tail -20
```

Expected: No TypeScript errors for MonthSelector

### Step 3: Commit

```bash
git add src/components/dashboard/MonthSelector.tsx
git commit -m "feat: redesign MonthSelector with grid dropdown (year rows × month columns)"
```

---

## Task 4: CategoryFilter Component

**Files:**
- Create: `src/components/dashboard/CategoryFilter.tsx`

### Step 1: Create the component

```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

interface CategoryFilterProps {
  categories: string[]
  selectedCategory?: string
}

export function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setCategory(category: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (category) params.set('category', category)
    else params.delete('category')
    router.push(`?${params.toString()}`)
  }

  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => {
        const isActive = selectedCategory === cat
        return (
          <button
            key={cat}
            onClick={() => setCategory(isActive ? null : cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 border border-white/[0.08] hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {cat}
            {isActive && <span className="text-cyan-400/70 hover:text-cyan-300 leading-none">×</span>}
          </button>
        )
      })}
    </div>
  )
}
```

### Step 2: Commit

```bash
git add src/components/dashboard/CategoryFilter.tsx
git commit -m "feat: add CategoryFilter chip row component"
```

---

## Task 5: Update Transactions Page

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

The page currently handles `?month=` only. Extend it to handle `?category=` and `?type=`, add CategoryFilter, and add RefreshButton.

### Step 1: Replace `src/app/(dashboard)/transactions/page.tsx`

```tsx
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { CategoryFilter } from '@/components/dashboard/CategoryFilter'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import {
  filterByMonth,
  filterByCategory,
  filterByType,
  getTotalIncome,
  getTotalExpenses,
  getAvailableMonths,
} from '@/lib/transactions'
import { getTransactions } from '@/lib/data'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; type?: string }>
}) {
  const { month, category, type } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)

  // Filter chain: month → category → type
  const byMonth = filterByMonth(transactions, month)
  // Derive category list from month-filtered transactions (before category filter)
  const categories = Array.from(new Set(
    byMonth.filter(t => t.type === 'expense').map(t => t.category)
  )).sort()
  const byCategory = filterByCategory(byMonth, category)
  const filtered = filterByType(byCategory, type)

  const income = getTotalIncome(filtered)
  const expenses = getTotalExpenses(filtered)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
            {month || category
              ? `${filtered.length} transactions · +$${income.toLocaleString()} · -$${expenses.toLocaleString()}${category ? ` · ${category}` : ''}`
              : `${transactions.length} transactions total`}
          </p>
        </div>
        <RefreshButton />
      </div>
      <MonthSelector months={months} />
      <CategoryFilter categories={categories} selectedCategory={category} />
      <TransactionsTable transactions={filtered} selectedType={type} />
    </div>
  )
}
```

### Step 2: Verify build

```bash
pnpm build 2>&1 | tail -20
```

Expected: TypeScript error on `selectedType` prop (TransactionsTable doesn't accept it yet — that's fine, Task 6 fixes it)

### Step 3: Commit

```bash
git add src/app/\(dashboard\)/transactions/page.tsx
git commit -m "feat: extend transactions page with category and type URL params"
```

---

## Task 6: Refactor TransactionsTable — Move Type Filter to URL

**Files:**
- Modify: `src/components/dashboard/TransactionsTable.tsx`

The type filter currently lives as `useState` inside this component. The server now controls it via URL. Remove the `typeFilter` state and its button row, and accept a `selectedType` prop so the active chip is highlighted.

### Step 1: Replace `src/components/dashboard/TransactionsTable.tsx`

```tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

interface TransactionsTableProps {
  transactions: Transaction[]
  selectedType?: string
}

export function TransactionsTable({ transactions, selectedType }: TransactionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')

  function setType(type: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (type && type !== 'all') params.set('type', type)
    else params.delete('type')
    router.push(`?${params.toString()}`)
  }

  const filtered = useMemo(() => transactions
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, search]
  )

  const activeType = selectedType || 'all'

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
            <button key={type} onClick={() => setType(type)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize cursor-pointer ${
                activeType === type
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

### Step 2: Verify build compiles cleanly

```bash
pnpm build 2>&1 | tail -20
```

Expected: No TypeScript errors

### Step 3: Commit

```bash
git add src/components/dashboard/TransactionsTable.tsx
git commit -m "feat: move type filter to URL param in TransactionsTable"
```

---

## Task 7: Update SpendingDonut — Client Navigation on Click

**Files:**
- Modify: `src/components/dashboard/SpendingDonut.tsx`

SpendingDonut is already a client component. Add an optional `month?: string` prop and make each pie slice navigate to `/transactions?category=...` (preserving `month` if set) on click.

### Step 1: Replace `src/components/dashboard/SpendingDonut.tsx`

```tsx
'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from 'next/navigation'

const COLORS = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

interface CategoryData {
  category: string
  amount: number
}

interface SpendingDonutProps {
  data: CategoryData[]
  month?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/10">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-cyan-400">${payload[0].value.toFixed(2)}</p>
      <p className="text-slate-500 mt-1">Click to drill down →</p>
    </div>
  )
}

export function SpendingDonut({ data, month }: SpendingDonutProps) {
  const router = useRouter()
  const total = data.reduce((s, d) => s + d.amount, 0)

  function handleCategoryClick(category: string) {
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    params.set('category', category)
    router.push(`/transactions?${params.toString()}`)
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Spending</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              strokeWidth={0}
              onClick={(entry) => handleCategoryClick(entry.category)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-bold text-white">${(total/1000).toFixed(1)}k</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">total</p>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5 mt-4">
        {data.slice(0, 6).map((d, i) => (
          <button
            key={d.category}
            onClick={() => handleCategoryClick(d.category)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[11px] text-slate-400 truncate hover:text-slate-200 transition-colors">{d.category}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Step 2: Commit

```bash
git add src/components/dashboard/SpendingDonut.tsx
git commit -m "feat: add click navigation to SpendingDonut slices and legend"
```

---

## Task 8: Update Spending Page — Clickable Rows + Pass Month to Donut

**Files:**
- Modify: `src/app/(dashboard)/spending/page.tsx`

Three changes: (1) pass `month` to `SpendingDonut`, (2) make category table rows into links, (3) add RefreshButton.

### Step 1: Replace `src/app/(dashboard)/spending/page.tsx`

```tsx
import Link from 'next/link'
import { SpendingDonut } from '@/components/dashboard/SpendingDonut'
import { SpendingTrends } from '@/components/dashboard/SpendingTrends'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { groupByCategory, groupByMonth, getTotalExpenses, filterByMonth, getAvailableMonths } from '@/lib/transactions'
import { format, parseISO } from 'date-fns'
import { getTransactions } from '@/lib/data'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { transactions } = await getTransactions()

  const months = getAvailableMonths(transactions)
  const filtered = filterByMonth(transactions, month)
  const expenses = filtered.filter(t => t.type === 'expense')

  const byCategory = groupByCategory(expenses)
  const categoryData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topCategories = categoryData.slice(0, 5).map(c => c.category)

  // Trend chart needs multiple months — only show in all-time view
  const allExpenses = transactions.filter(t => t.type === 'expense')
  const trendData = month ? [] : Object.entries(groupByMonth(allExpenses))
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
  const allExpenseMonthCount = Math.max(
    Object.keys(groupByMonth(allExpenses)).length,
    1
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Spending</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Breakdown by category and time</p>
        </div>
        <RefreshButton />
      </div>
      <MonthSelector months={months} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Spent" value={`$${totalSpend.toLocaleString()}`} trend="down" />
        <StatCard title="Top Category" value={categoryData[0]?.category ?? '—'} />
        {!month && (
          <StatCard title="Avg / Month" value={`$${(totalSpend / allExpenseMonthCount).toFixed(0)}`} />
        )}
      </div>
      <div className={month ? 'grid grid-cols-1' : 'grid md:grid-cols-2 gap-4 md:gap-6'}>
        <SpendingDonut data={categoryData.slice(0, 6)} month={month} />
        {!month && <SpendingTrends data={trendData} categories={topCategories} />}
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
            {categoryData.map(({ category, amount }, i) => {
              const href = `/transactions?${month ? `month=${month}&` : ''}category=${encodeURIComponent(category)}`
              return (
                <tr key={category} className={`border-b border-white/[0.03] transition-colors ${i === categoryData.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-300">
                    <Link href={href} className="hover:text-cyan-400 transition-colors flex items-center gap-1 group">
                      {category}
                      <span className="opacity-0 group-hover:opacity-60 text-xs transition-opacity">→</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-white font-medium">${amount.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
                    {totalSpend > 0 ? ((amount / totalSpend) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {categoryData.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No expense data</div>
        )}
      </div>
    </div>
  )
}
```

### Step 2: Commit

```bash
git add src/app/\(dashboard\)/spending/page.tsx
git commit -m "feat: add category drill-down links and RefreshButton to spending page"
```

---

## Task 9: Add RefreshButton to Remaining Page Headers

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/app/(dashboard)/investments/page.tsx`
- Modify: `src/app/(dashboard)/insights/page.tsx`

Each page needs `RefreshButton` imported and placed in the header `<div>` using `flex items-start justify-between`.

### Step 1: Update Overview page (`src/app/(dashboard)/page.tsx`)

In the return JSX, replace:
```tsx
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Financial snapshot</p>
      </div>
```
with:
```tsx
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Financial snapshot</p>
        </div>
        <RefreshButton />
      </div>
```

And add the import at the top:
```tsx
import { RefreshButton } from '@/components/dashboard/RefreshButton'
```

### Step 2: Update Investments page (`src/app/(dashboard)/investments/page.tsx`)

Add import:
```tsx
import { RefreshButton } from '@/components/dashboard/RefreshButton'
```

Replace the header `<div>`:
```tsx
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Investments</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Portfolio holdings and allocation</p>
      </div>
```
with:
```tsx
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Investments</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Portfolio holdings and allocation</p>
        </div>
        <RefreshButton />
      </div>
```

### Step 3: Update Insights page (`src/app/(dashboard)/insights/page.tsx`)

Add import:
```tsx
import { RefreshButton } from '@/components/dashboard/RefreshButton'
```

Replace the header `<div>`:
```tsx
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">AI Insights</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
          {insights.generated_at
            ? `Last updated ${new Date(insights.generated_at).toLocaleDateString()}`
            : 'Generated by Claude Code from your transaction data'}
        </p>
      </div>
```
with:
```tsx
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Insights</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
            {insights.generated_at
              ? `Last updated ${new Date(insights.generated_at).toLocaleDateString()}`
              : 'Generated by Claude Code from your transaction data'}
          </p>
        </div>
        <RefreshButton />
      </div>
```

### Step 4: Commit

```bash
git add src/app/\(dashboard\)/page.tsx src/app/\(dashboard\)/investments/page.tsx src/app/\(dashboard\)/insights/page.tsx
git commit -m "feat: add RefreshButton to Overview, Investments, and Insights page headers"
```

---

## Task 10: Final Build Check

### Step 1: Run all tests

```bash
pnpm test:run
```

Expected: All 19 tests passing

### Step 2: Full build

```bash
pnpm build
```

Expected: No TypeScript errors, all pages compile as `ƒ Dynamic`

### Step 3: Commit if any cleanup needed

If build reveals any TypeScript issues, fix them and commit. Otherwise done.
