'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Toast } from '@/components/dashboard/Toast'
import { mergeCategoriesForType } from '@/lib/categories'
import type { TransactionType } from '@/types/transaction'
import { fetchJson } from '@/lib/fetch-json'

function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function QuickAddForm({
  userCategories = [],
}: {
  userCategories?: string[]
}) {
  const router = useRouter()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [category, setCategory] = useState('')
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<{ id: string; description: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const signedAmount = useMemo(() => {
    const v = parseFloat(amount)
    if (!Number.isFinite(v)) return null
    if (type === 'income') return Math.abs(v)
    return -Math.abs(v)
  }, [amount, type])

  const categoryOptions = useMemo(
    () => mergeCategoriesForType(type, [...userCategories, ...extraCategories]),
    [type, userCategories, extraCategories],
  )

  function switchType(t: TransactionType) {
    setType(t)
    setCategory('')
    setTicker('')
    setShares('')
  }

  function addCustomCategory() {
    const trimmed = newCatValue.trim()
    if (!trimmed) return
    setExtraCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setCategory(trimmed)
    setNewCatValue('')
    setNewCatOpen(false)
  }

  async function submit(e: React.FormEvent, forceCreate = false) {
    e.preventDefault()
    setError(null)
    setDuplicate(null)
    if (signedAmount === null || !description.trim() || !category) {
      setError('Fill amount, description, and category')
      return
    }
    if (type === 'investment' && !ticker.trim()) {
      setError('Enter a ticker symbol (e.g. NDQ, AAPL)')
      return
    }
    setSubmitting(true)
    const body: Record<string, unknown> = {
      date,
      amount: signedAmount,
      type,
      category,
      description: description.trim(),
      source: 'manual',
      forceCreate,
    }
    if (type === 'investment') {
      body.ticker = ticker.trim().toUpperCase()
      const parsedShares = parseFloat(shares)
      if (Number.isFinite(parsedShares) && parsedShares > 0) {
        body.shares = parsedShares
      }
    }
    const { ok, status, data, error: err } = await fetchJson<{
      duplicateOf?: string
      transaction?: { description?: string }
    }>('/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (status === 409 && data?.duplicateOf) {
      setDuplicate({
        id: data.duplicateOf,
        description: data.transaction?.description ?? description,
      })
      setSubmitting(false)
      return
    }
    if (!ok) {
      setError(err ?? 'Failed to save')
      setSubmitting(false)
      return
    }

    const savedDescription = description.trim()
    const savedAmount = Math.abs(signedAmount!)
    setAmount('')
    setDescription('')
    setCategory('')
    setTicker('')
    setShares('')
    setSubmitting(false)
    router.refresh()
    setToast(`${savedDescription} — $${savedAmount.toFixed(2)}`)
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <>
      {toast && <Toast message={toast} onDone={clearToast} />}
    <form onSubmit={(e) => submit(e, false)} className="ios-card p-5 space-y-5">
      <TypeToggle value={type} onChange={switchType} />

      <Field label="Amount">
        <div className="flex items-center gap-2">
          <span className="text-[24px] font-semibold" style={{ color: 'rgba(235,235,245,0.5)' }}>$</span>
          <input
            autoFocus
            inputMode="decimal"
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="flex-1 bg-transparent text-[32px] font-semibold outline-none text-white placeholder:text-[rgba(235,235,245,0.25)]"
          />
        </div>
      </Field>

      <Field label="Description">
        <input
          type="text"
          placeholder="e.g. Woolworths Metro"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-transparent text-[17px] outline-none text-white placeholder:text-[rgba(235,235,245,0.25)] py-1"
        />
      </Field>

      {type === 'investment' && (
        <div className="flex gap-3">
          <Field label="Ticker *">
            <input
              type="text"
              placeholder="e.g. NDQ"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full bg-transparent text-[17px] outline-none text-white placeholder:text-[rgba(235,235,245,0.25)] py-1 uppercase"
            />
          </Field>
          <Field label="Units / Shares">
            <input
              inputMode="decimal"
              type="text"
              placeholder="0"
              value={shares}
              onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full bg-transparent text-[17px] outline-none text-white placeholder:text-[rgba(235,235,245,0.25)] py-1"
            />
          </Field>
        </div>
      )}

      <div>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(235,235,245,0.45)' }}
        >
          Category
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categoryOptions.map((c) => {
            const active = c === category
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                style={{
                  background: active ? 'rgba(10,132,255,0.2)' : 'rgba(120,120,128,0.16)',
                  color: active ? '#0a84ff' : 'rgba(235,235,245,0.75)',
                }}
              >
                {c}
              </button>
            )
          })}
          {!newCatOpen && (
            <button
              type="button"
              onClick={() => setNewCatOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px]"
              style={{ background: 'rgba(120,120,128,0.1)', color: 'rgba(235,235,245,0.6)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add new
            </button>
          )}
        </div>
        {newCatOpen && (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={newCatValue}
              onChange={(e) => setNewCatValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomCategory()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setNewCatOpen(false)
                  setNewCatValue('')
                }
              }}
              placeholder="Category name"
              className="flex-1 bg-transparent text-[14px] outline-none text-white placeholder:text-[rgba(235,235,245,0.3)] border-b border-[rgba(84,84,88,0.5)] py-1"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              className="px-3 py-1 rounded-md text-[13px] font-medium"
              style={{ background: '#0a84ff', color: '#fff' }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setNewCatOpen(false); setNewCatValue('') }}
              className="px-3 py-1 rounded-md text-[13px]"
              style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.7)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent text-[15px] outline-none text-white py-1"
        />
      </Field>

      {error && (
        <div className="text-[14px]" style={{ color: '#ff453a' }}>{error}</div>
      )}

      {duplicate && (
        <div
          className="rounded-lg p-3 text-[14px] space-y-2"
          style={{ background: 'rgba(255,159,10,0.1)', color: '#ff9f0a' }}
        >
          <p>Looks like a duplicate of &ldquo;{duplicate.description}&rdquo;. Add anyway?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => submit(e, true)}
              className="px-3 py-1.5 rounded-md text-[13px] font-medium"
              style={{ background: '#ff9f0a', color: '#000' }}
            >
              Add as new
            </button>
            <button
              type="button"
              onClick={() => setDuplicate(null)}
              className="px-3 py-1.5 rounded-md text-[13px] font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(235,235,245,0.8)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || signedAmount === null || !description.trim() || !category}
        className="w-full rounded-xl py-3 text-[17px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#0a84ff', color: '#fff' }}
      >
        {submitting ? 'Saving…' : 'Add transaction'}
      </button>
    </form>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'rgba(235,235,245,0.45)' }}
      >
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType
  onChange: (v: TransactionType) => void
}) {
  const items: { id: TransactionType; label: string }[] = [
    { id: 'expense', label: 'Expense' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfer' },
    { id: 'investment', label: 'Invest' },
  ]
  return (
    <div
      className="grid grid-cols-4 rounded-xl p-[3px]"
      style={{ background: 'rgba(120,120,128,0.16)' }}
    >
      {items.map((it) => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className="py-1.5 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: active ? 'rgba(118,118,128,0.24)' : 'transparent',
              color: active ? '#fff' : 'rgba(235,235,245,0.55)',
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
