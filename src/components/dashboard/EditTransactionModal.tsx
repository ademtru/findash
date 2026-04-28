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
