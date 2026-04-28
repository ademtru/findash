# Transaction Edit & Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add edit and split actions to the transactions table — edit opens a pre-filled modal to patch any field; split divides one transaction into N independent ones feeding into the existing combine workflow.

**Architecture:** PATCH added to the existing `/api/transactions/[id]` route (DB layer already has `updateTransaction()`). Split gets its own `/api/transactions/[id]/split` POST route that deletes the original and inserts N new rows. Two new modal components wired into `TransactionsTable` via `editingId` / `splittingId` state.

**Tech Stack:** Next.js App Router, Drizzle ORM, Zod validation, Vitest, Tailwind + inline styles (iOS design system already in use)

---

### Task 1: Add PATCH handler to the transactions route

**Files:**
- Modify: `src/app/api/transactions/[id]/route.ts`

**Step 1: Read the current file**

`src/app/api/transactions/[id]/route.ts` currently has GET and DELETE. Add PATCH below them.

**Step 2: Add the PATCH handler**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteTransaction, getTransactionById, updateTransaction } from '@/db/queries/transactions'
import { TRANSACTION_TYPES } from '@/lib/ai/schemas'

// ... existing GET and DELETE ...

const PatchBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().finite().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.string().min(1).max(60).optional(),
  description: z.string().min(1).max(160).optional(),
  account: z.string().max(120).optional(),
  ticker: z.string().nullable().optional(),
  shares: z.number().nullable().optional(),
  price_per_share: z.number().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: z.infer<typeof PatchBody>
  try {
    body = PatchBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }
  const transaction = await updateTransaction(id, body)
  if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ transaction })
}
```

**Step 3: Verify it builds**

```bash
cd /path/to/findash && npx tsc --noEmit
```
Expected: no errors

**Step 4: Commit**

```bash
git add src/app/api/transactions/[id]/route.ts
git commit -m "feat: add PATCH handler to transactions/[id] route"
```

---

### Task 2: Split validation lib function + test

**Files:**
- Create: `src/lib/transactions/split.ts`
- Create: `src/test/lib/transaction-split.test.ts`

**Step 1: Write the failing test first**

`src/test/lib/transaction-split.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateSplits } from '@/lib/transactions/split'

describe('validateSplits', () => {
  it('returns null when splits sum exactly to original', () => {
    expect(validateSplits(100, [{ amount: 60 }, { amount: 40 }])).toBeNull()
  })

  it('returns error when splits sum less than original', () => {
    expect(validateSplits(100, [{ amount: 60 }, { amount: 30 }])).not.toBeNull()
  })

  it('returns error when splits sum more than original', () => {
    expect(validateSplits(100, [{ amount: 60 }, { amount: 50 }])).not.toBeNull()
  })

  it('returns error when fewer than 2 splits', () => {
    expect(validateSplits(100, [{ amount: 100 }])).not.toBeNull()
  })

  it('returns error when any split has zero amount', () => {
    expect(validateSplits(100, [{ amount: 100 }, { amount: 0 }])).not.toBeNull()
  })

  it('handles floating point within tolerance', () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    expect(validateSplits(100, [
      { amount: 33.33 },
      { amount: 33.33 },
      { amount: 33.34 },
    ])).toBeNull()
  })

  it('handles negative original amount (expense/split)', () => {
    expect(validateSplits(-100, [{ amount: -60 }, { amount: -40 }])).toBeNull()
  })
})
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run src/test/lib/transaction-split.test.ts
```
Expected: FAIL — `validateSplits` not found

**Step 3: Implement the function**

`src/lib/transactions/split.ts`:

```typescript
const TOLERANCE = 0.005

export function validateSplits(
  originalAmount: number,
  splits: { amount: number }[],
): string | null {
  if (splits.length < 2) return 'Must have at least 2 splits'
  if (splits.some((s) => s.amount === 0)) return 'Each split must have a non-zero amount'
  const sum = splits.reduce((acc, s) => acc + s.amount, 0)
  if (Math.abs(sum - originalAmount) > TOLERANCE) {
    return `Splits total $${Math.abs(sum).toFixed(2)} but original is $${Math.abs(originalAmount).toFixed(2)}`
  }
  return null
}
```

**Step 4: Run test to confirm it passes**

```bash
npx vitest run src/test/lib/transaction-split.test.ts
```
Expected: all 7 tests PASS

**Step 5: Commit**

```bash
git add src/lib/transactions/split.ts src/test/lib/transaction-split.test.ts
git commit -m "feat: add split validation lib function with tests"
```

---

### Task 3: Split API route

**Files:**
- Create: `src/app/api/transactions/[id]/split/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTransactionById, deleteTransaction, insertTransaction } from '@/db/queries/transactions'
import { generateTransactionId } from '@/lib/transactions/id'
import { validateSplits } from '@/lib/transactions/split'

const SplitBody = z.object({
  splits: z.array(z.object({
    amount: z.number().finite(),
    description: z.string().min(1).max(160),
    category: z.string().min(1).max(60),
  })).min(2),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const original = await getTransactionById(id)
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: z.infer<typeof SplitBody>
  try {
    body = SplitBody.parse(await request.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : undefined
    return NextResponse.json({ error: 'Invalid body', issues }, { status: 400 })
  }

  const validationError = validateSplits(original.amount, body.splits)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 })
  }

  await deleteTransaction(id)

  const inserted = await Promise.all(
    body.splits.map((split) => {
      const splitId = generateTransactionId({
        date: original.date,
        amount: split.amount,
        description: split.description,
      })
      return insertTransaction({
        id: splitId,
        date: original.date,
        amount: String(split.amount),
        type: original.type,
        category: split.category,
        description: split.description,
        account: original.account,
        source: 'manual',
      })
    }),
  )

  return NextResponse.json({ transactions: inserted }, { status: 201 })
}
```

**Step 2: Verify it builds**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/api/transactions/[id]/split/route.ts
git commit -m "feat: add POST /api/transactions/[id]/split route"
```

---

### Task 4: EditTransactionModal component

**Files:**
- Create: `src/components/dashboard/EditTransactionModal.tsx`

**Step 1: Create the component**

Model this after `QuickAddForm` — same Field/TypeToggle patterns, same inline styles. Key differences: pre-filled from `transaction` prop, sends PATCH not POST, no duplicate detection.

```typescript
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { mergeCategoriesForType } from '@/lib/categories'
import { fetchJson } from '@/lib/fetch-json'
import type { Transaction, TransactionType } from '@/types/transaction'

interface EditTransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

export function EditTransactionModal({ transaction, onClose }: EditTransactionModalProps) {
  const router = useRouter()
  const [type, setType] = useState<TransactionType>(transaction.type)
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)))
  const [description, setDescription] = useState(transaction.description)
  const [date, setDate] = useState(transaction.date)
  const [category, setCategory] = useState(transaction.category)
  const [account, setAccount] = useState(transaction.account)
  const [ticker, setTicker] = useState(transaction.ticker ?? '')
  const [shares, setShares] = useState(transaction.shares ? String(transaction.shares) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signedAmount = useMemo(() => {
    const v = parseFloat(amount)
    if (!Number.isFinite(v)) return null
    return type === 'income' ? Math.abs(v) : -Math.abs(v)
  }, [amount, type])

  const categoryOptions = useMemo(
    () => mergeCategoriesForType(type, []),
    [type],
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (signedAmount === null || !description.trim() || !category) {
      setError('Fill amount, description, and category')
      return
    }
    setSubmitting(true)
    const body: Record<string, unknown> = {
      date,
      amount: signedAmount,
      type,
      category,
      description: description.trim(),
      account: account.trim() || 'Main',
    }
    if (type === 'investment') {
      body.ticker = ticker.trim().toUpperCase() || null
      const parsedShares = parseFloat(shares)
      body.shares = Number.isFinite(parsedShares) && parsedShares > 0 ? parsedShares : null
    } else {
      body.ticker = null
      body.shares = null
      body.price_per_share = null
    }
    const { ok, error: err } = await fetchJson(
      `/api/transactions/${encodeURIComponent(transaction.id)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
    setSubmitting(false)
    if (!ok) { setError(err ?? 'Save failed'); return }
    router.refresh()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4"
        style={{ background: '#1c1c1e' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-white">Edit Transaction</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full"
            style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.6)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-4 rounded-xl p-[3px]" style={{ background: 'rgba(120,120,128,0.16)' }}>
            {(['expense', 'income', 'transfer', 'investment'] as TransactionType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className="py-1.5 rounded-lg text-[13px] font-medium transition-all capitalize"
                style={type === t
                  ? { background: 'rgba(118,118,128,0.24)', color: '#fff' }
                  : { background: 'transparent', color: 'rgba(235,235,245,0.55)' }}>
                {t === 'investment' ? 'Invest' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Amount */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Amount</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[24px] font-semibold" style={{ color: 'rgba(235,235,245,0.5)' }}>$</span>
              <input inputMode="decimal" type="text" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="flex-1 bg-transparent text-[28px] font-semibold outline-none text-white" />
            </div>
          </label>

          {/* Description */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Description</span>
            <div className="mt-1">
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent text-[17px] outline-none text-white py-1" />
            </div>
          </label>

          {/* Investment fields */}
          {type === 'investment' && (
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Ticker</span>
                <div className="mt-1">
                  <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full bg-transparent text-[17px] outline-none text-white py-1 uppercase" />
                </div>
              </label>
              <label className="block flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Shares</span>
                <div className="mt-1">
                  <input inputMode="decimal" type="text" value={shares}
                    onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-transparent text-[17px] outline-none text-white py-1" />
                </div>
              </label>
            </div>
          )}

          {/* Category */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Category</span>
            <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {categoryOptions.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                  style={category === c
                    ? { background: 'rgba(10,132,255,0.2)', color: '#0a84ff' }
                    : { background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.75)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Date</span>
            <div className="mt-1">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-[15px] outline-none text-white py-1" />
            </div>
          </label>

          {/* Account */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.45)' }}>Account</span>
            <div className="mt-1">
              <input type="text" value={account} onChange={(e) => setAccount(e.target.value)}
                className="w-full bg-transparent text-[15px] outline-none text-white py-1" />
            </div>
          </label>

          {error && <p className="text-[14px]" style={{ color: '#ff453a' }}>{error}</p>}

          <button type="submit" disabled={submitting || signedAmount === null || !description.trim() || !category}
            className="w-full rounded-xl py-3 text-[17px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: '#0a84ff', color: '#fff' }}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Verify it builds**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/dashboard/EditTransactionModal.tsx
git commit -m "feat: add EditTransactionModal component"
```

---

### Task 5: SplitTransactionModal component

**Files:**
- Create: `src/components/dashboard/SplitTransactionModal.tsx`

**Step 1: Create the component**

Key logic: running total that turns green when splits sum to original, confirm disabled otherwise. Each row has amount + description + category. Inherits type/date/account from original.

```typescript
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Loader2, Scissors } from 'lucide-react'
import { mergeCategoriesForType } from '@/lib/categories'
import { fetchJson } from '@/lib/fetch-json'
import { validateSplits } from '@/lib/transactions/split'
import type { Transaction } from '@/types/transaction'

interface SplitRow {
  amount: string
  description: string
  category: string
}

interface SplitTransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

export function SplitTransactionModal({ transaction, onClose }: SplitTransactionModalProps) {
  const router = useRouter()
  const originalAbs = Math.abs(transaction.amount)
  const sign = transaction.amount < 0 ? -1 : 1

  const [rows, setRows] = useState<SplitRow[]>([
    { amount: String(originalAbs), description: transaction.description, category: transaction.category },
    { amount: '0', description: '', category: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = useMemo(
    () => mergeCategoriesForType(transaction.type, []),
    [transaction.type],
  )

  const parsedSplits = rows.map((r) => ({
    amount: sign * Math.abs(parseFloat(r.amount) || 0),
    description: r.description,
    category: r.category,
  }))

  const totalAssigned = parsedSplits.reduce((s, r) => s + Math.abs(r.amount), 0)
  const validationError = validateSplits(transaction.amount, parsedSplits)
  const canSubmit = !validationError && rows.every((r) => r.description.trim() && r.category)

  function updateRow(index: number, field: keyof SplitRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows((prev) => [...prev, { amount: '0', description: '', category: '' }])
  }

  function removeRow(index: number) {
    if (rows.length <= 2) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function confirm() {
    setError(null)
    if (!canSubmit) return
    setSubmitting(true)
    const { ok, error: err } = await fetchJson(
      `/api/transactions/${encodeURIComponent(transaction.id)}/split`,
      {
        method: 'POST',
        body: JSON.stringify({ splits: parsedSplits }),
      },
    )
    setSubmitting(false)
    if (!ok) { setError(err ?? 'Split failed'); return }
    router.refresh()
    onClose()
  }

  const balanced = Math.abs(totalAssigned - originalAbs) < 0.005

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: '#1c1c1e' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4" style={{ color: 'rgba(235,235,245,0.5)' }} />
            <h2 className="text-[17px] font-semibold text-white">Split Transaction</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full"
            style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.6)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Original */}
        <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(120,120,128,0.12)' }}>
          <p className="text-[13px] text-white font-medium">{transaction.description}</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
            Original: ${originalAbs.toFixed(2)} · {transaction.date}
          </p>
        </div>

        {/* Running total */}
        <div className="flex items-center justify-between text-[13px]">
          <span style={{ color: 'rgba(235,235,245,0.5)' }}>Assigned</span>
          <span className="font-semibold tabular-nums"
            style={{ color: balanced ? '#30d158' : totalAssigned > originalAbs ? '#ff453a' : '#ff9f0a' }}>
            ${totalAssigned.toFixed(2)} / ${originalAbs.toFixed(2)}
          </span>
        </div>

        {/* Split rows */}
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl p-3 space-y-2.5"
              style={{ background: 'rgba(120,120,128,0.1)', border: '0.5px solid rgba(84,84,88,0.3)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(235,235,245,0.35)' }}>
                  Split {i + 1}
                </span>
                {rows.length > 2 && (
                  <button type="button" onClick={() => removeRow(i)}
                    className="p-1 rounded" style={{ color: 'rgba(255,69,58,0.6)' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Amount */}
              <div className="flex items-center gap-1.5">
                <span className="text-[18px] font-semibold" style={{ color: 'rgba(235,235,245,0.4)' }}>$</span>
                <input inputMode="decimal" type="text" value={row.amount}
                  onChange={(e) => updateRow(i, 'amount', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 bg-transparent text-[22px] font-semibold outline-none text-white" />
              </div>

              {/* Description */}
              <input type="text" placeholder="Description" value={row.description}
                onChange={(e) => updateRow(i, 'description', e.target.value)}
                className="w-full bg-transparent text-[15px] outline-none text-white py-0.5 border-b"
                style={{ borderColor: 'rgba(84,84,88,0.4)' }} />

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {categoryOptions.map((c) => (
                  <button key={c} type="button" onClick={() => updateRow(i, 'category', c)}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
                    style={row.category === c
                      ? { background: 'rgba(10,132,255,0.2)', color: '#0a84ff' }
                      : { background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.65)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add split */}
        <button type="button" onClick={addRow}
          className="w-full py-2 rounded-xl text-[14px] font-medium flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(120,120,128,0.12)', color: 'rgba(235,235,245,0.55)' }}>
          <Plus className="h-4 w-4" /> Add split
        </button>

        {error && <p className="text-[13px]" style={{ color: '#ff453a' }}>{error}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl text-[15px] font-medium"
            style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!canSubmit || submitting}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0a84ff', color: '#fff' }}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Splitting…</> : 'Split'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify it builds**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/dashboard/SplitTransactionModal.tsx
git commit -m "feat: add SplitTransactionModal component"
```

---

### Task 6: Wire edit and split into TransactionsTable

**Files:**
- Modify: `src/components/dashboard/TransactionsTable.tsx`

This is the most involved task. Make each change carefully.

**Step 1: Add imports at the top of TransactionsTable.tsx**

Add these imports after the existing ones:
```typescript
import { Pencil, Scissors } from 'lucide-react'
import { EditTransactionModal } from './EditTransactionModal'
import { SplitTransactionModal } from './SplitTransactionModal'
```

**Step 2: Add state inside the component**

In the `TransactionsTable` component body, after the existing state declarations, add:
```typescript
const [editingId, setEditingId] = useState<string | null>(null)
const [splittingId, setSplittingId] = useState<string | null>(null)

const editingTransaction = editingId ? transactions.find(t => t.id === editingId) ?? null : null
const splittingTransaction = splittingId ? transactions.find(t => t.id === splittingId) ?? null : null
```

**Step 3: Add modals at the end of the returned JSX**

Just before the closing `</div>` of the returned JSX, add:
```typescript
{editingTransaction && (
  <EditTransactionModal
    transaction={editingTransaction}
    onClose={() => setEditingId(null)}
  />
)}
{splittingTransaction && (
  <SplitTransactionModal
    transaction={splittingTransaction}
    onClose={() => setSplittingId(null)}
  />
)}
```

**Step 4: Add pencil + scissors to the desktop action buttons**

In the desktop table, find the block that renders the hover action buttons for non-combine mode. It currently looks like:
```typescript
<div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
  {isGrouped && ( ... ungroup button ... )}
  {!isGrouped && ( ... combine button ... )}
  <button type="button" onClick={() => { setPendingDelete(t.id); setDeleteError(null) }} ...>
    <Trash2 className="h-3.5 w-3.5" />
  </button>
</div>
```

Add edit and split buttons inside that div, before the trash button:
```typescript
<button type="button" onClick={() => setEditingId(t.id)}
  className="p-1.5 rounded-md" style={{ color: 'rgba(235,235,245,0.4)' }} title="Edit">
  <Pencil className="h-3.5 w-3.5" />
</button>
{!isGrouped && (
  <button type="button" onClick={() => setSplittingId(t.id)}
    className="p-1.5 rounded-md" style={{ color: 'rgba(235,235,245,0.4)' }} title="Split">
    <Scissors className="h-3.5 w-3.5" />
  </button>
)}
```

**Step 5: Add edit + split to the mobile action bar**

In the mobile section, find the `isPending && !combineMode` block where Delete/Combine/Ungroup/Cancel buttons appear. Add Edit and Split buttons in that group:

```typescript
<button type="button" onClick={() => { setPendingDelete(null); setEditingId(t.id) }}
  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold"
  style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}>
  <Pencil className="h-3 w-3" />
  Edit
</button>
{!isGrouped && (
  <button type="button" onClick={() => { setPendingDelete(null); setSplittingId(t.id) }}
    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold"
    style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}>
    <Scissors className="h-3 w-3" />
    Split
  </button>
)}
```

**Step 6: Verify it builds**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 7: Run all tests**

```bash
npx vitest run --passWithNoTests
```
Expected: all pass

**Step 8: Start dev server and manually test**

```bash
npm run dev
```

Test checklist:
- [ ] Desktop: hover a row → pencil and scissors icons appear
- [ ] Click pencil → EditTransactionModal opens pre-filled with correct values
- [ ] Change a field, save → table reflects the update
- [ ] Click outside modal → closes without saving
- [ ] Click scissors → SplitTransactionModal opens with original at top
- [ ] Running total turns green when splits balance
- [ ] Confirm disabled when splits don't sum to original
- [ ] After split, original row gone, new rows visible in table
- [ ] New rows can be combined with existing transactions using combine mode
- [ ] Mobile: tap a row → Edit and Split buttons appear in action bar
- [ ] Grouped transactions: scissors icon does NOT appear

**Step 9: Commit**

```bash
git add src/components/dashboard/TransactionsTable.tsx
git commit -m "feat: wire edit and split actions into TransactionsTable"
```
