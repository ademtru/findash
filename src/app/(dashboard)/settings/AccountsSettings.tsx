'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Pencil, X, Loader2, Camera, AlertTriangle } from 'lucide-react'
import type { AccountRow } from '@/db/schema'
import { ACCOUNT_TYPES, type AccountType } from '@/db/schema'
import { fetchJson } from '@/lib/fetch-json'

export type EnrichedAccount = AccountRow & {
  derived: number
  snapshot: number | null
  diff: number | null
  txnCount: number
}

const TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  brokerage: 'Brokerage',
  credit: 'Credit',
  loan: 'Loan',
}

function fmtMoney(n: number) {
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: Date | string | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AccountsSettings({ initial }: { initial: EnrichedAccount[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<EnrichedAccount | null>(null)
  const [stampingId, setStampingId] = useState<string | null>(null)

  // Add-form state
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [last4, setLast4] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    const { ok, error: err } = await fetchJson<{ account: AccountRow }>('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, institution: institution || undefined, last4 }),
    })
    setAdding(false)
    if (!ok) {
      setAddError(err ?? 'Failed to add account')
      return
    }
    setName('')
    setInstitution('')
    setLast4('')
    router.refresh()
  }

  async function handleDelete(id: string) {
    const { ok } = await fetchJson(`/api/accounts/${id}`, { method: 'DELETE' })
    if (ok) router.refresh()
  }

  async function handleStamp(account: EnrichedAccount) {
    setStampingId(account.id)
    const { ok } = await fetchJson(`/api/accounts/${account.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        balanceSnapshot: account.derived.toFixed(2),
        snapshotAt: new Date().toISOString(),
      }),
    })
    setStampingId(null)
    if (ok) router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {initial.length === 0 ? (
          <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
            No accounts added yet.
          </p>
        ) : (
          initial.map((a) => <AccountCard
            key={a.id}
            account={a}
            onEdit={() => setEditing(a)}
            onDelete={() => handleDelete(a.id)}
            onStamp={() => handleStamp(a)}
            stamping={stampingId === a.id}
          />)
        )}
      </div>

      <form onSubmit={handleAdd} className="ios-card px-4 py-4 space-y-3">
        <p
          className="text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(235,235,245,0.45)' }}
        >
          Add account
        </p>

        <div className="space-y-2">
          <input
            required
            placeholder="Name (e.g. ANZ Savings)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[rgba(120,120,128,0.12)] rounded-lg px-3 py-2 text-[14px] text-white outline-none placeholder:text-[rgba(235,235,245,0.3)] focus:ring-1 focus:ring-[rgba(10,132,255,0.5)]"
          />
          <input
            placeholder="Institution (optional)"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full bg-[rgba(120,120,128,0.12)] rounded-lg px-3 py-2 text-[14px] text-white outline-none placeholder:text-[rgba(235,235,245,0.3)] focus:ring-1 focus:ring-[rgba(10,132,255,0.5)]"
          />
          <input
            required
            placeholder="Last 4 digits (e.g. 1234)"
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            className="w-full bg-[rgba(120,120,128,0.12)] rounded-lg px-3 py-2 text-[14px] text-white outline-none placeholder:text-[rgba(235,235,245,0.3)] focus:ring-1 focus:ring-[rgba(10,132,255,0.5)]"
          />
        </div>

        {addError && (
          <p className="text-[13px]" style={{ color: '#ff453a' }}>{addError}</p>
        )}

        <button
          type="submit"
          disabled={adding || last4.length !== 4 || name.trim() === ''}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#0a84ff', color: '#fff' }}
        >
          <Plus className="h-4 w-4" />
          {adding ? 'Adding…' : 'Add account'}
        </button>
      </form>

      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function AccountCard({
  account,
  onEdit,
  onDelete,
  onStamp,
  stamping,
}: {
  account: EnrichedAccount
  onEdit: () => void
  onDelete: () => void
  onStamp: () => void
  stamping: boolean
}) {
  const hasDiff = account.diff !== null && Math.abs(account.diff) > 0.01

  return (
    <div className="ios-card px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-white truncate">{account.name}</p>
          <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
            {account.institution ? `${account.institution} · ` : ''}••••{account.last4}
            <span className="ml-2 px-1.5 py-0.5 rounded text-[11px]"
              style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.7)' }}>
              {TYPE_LABELS[account.type as AccountType] ?? account.type}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(120,120,128,0.15)] transition-colors"
            style={{ color: 'rgba(235,235,245,0.5)' }}
            aria-label={`Edit ${account.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,69,58,0.15)] transition-colors"
            style={{ color: 'rgba(235,235,245,0.4)' }}
            aria-label={`Remove ${account.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        <div style={{ color: 'rgba(235,235,245,0.5)' }}>Starting</div>
        <div className="text-right text-white">
          {fmtMoney(Number(account.startingBalance))}
          <span className="ml-1.5 text-[11px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
            on {fmtDate(account.startingDate)}
          </span>
        </div>

        <div style={{ color: 'rgba(235,235,245,0.5)' }}>Derived</div>
        <div className="text-right text-white">
          {fmtMoney(account.derived)}
          <span className="ml-1.5 text-[11px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
            {account.txnCount} txns
          </span>
        </div>

        <div style={{ color: 'rgba(235,235,245,0.5)' }}>Manual</div>
        <div className="text-right">
          {account.snapshot === null ? (
            <span style={{ color: 'rgba(235,235,245,0.35)' }}>— never stamped</span>
          ) : (
            <span className="text-white">
              {fmtMoney(account.snapshot)}
              {account.snapshotAt && (
                <span className="ml-1.5 text-[11px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
                  {fmtDate(account.snapshotAt)}
                </span>
              )}
            </span>
          )}
        </div>

        {account.diff !== null && (
          <>
            <div style={{ color: 'rgba(235,235,245,0.5)' }}>Diff</div>
            <div className="text-right flex items-center justify-end gap-1">
              {hasDiff && (
                <AlertTriangle className="h-3 w-3" style={{ color: '#ff9f0a' }} />
              )}
              <span style={{ color: hasDiff ? '#ff9f0a' : 'rgba(50,215,75,0.9)' }}>
                {fmtMoney(account.diff)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStamp}
          disabled={stamping}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
          style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.85)' }}
        >
          {stamping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          {account.snapshot === null ? 'Stamp snapshot' : 'Update snapshot'}
        </button>
      </div>
    </div>
  )
}

function EditAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: EnrichedAccount
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<AccountType>(account.type as AccountType)
  const [startingBalance, setStartingBalance] = useState(account.startingBalance)
  const [startingDate, setStartingDate] = useState(account.startingDate)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const balance = Number(startingBalance)
    if (!Number.isFinite(balance)) {
      setError('Starting balance must be a number')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startingDate)) {
      setError('Starting date must be YYYY-MM-DD')
      return
    }
    setSubmitting(true)
    const { ok, error: err } = await fetchJson(`/api/accounts/${account.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type,
        startingBalance: balance.toFixed(2),
        startingDate,
      }),
    })
    setSubmitting(false)
    if (!ok) {
      setError(err ?? 'Failed to save')
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: '#1c1c1e' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-white">Edit {account.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full"
            style={{ background: 'rgba(120,120,128,0.2)', color: 'rgba(235,235,245,0.6)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(235,235,245,0.45)' }}>
              Type
            </span>
            <div className="mt-1 grid grid-cols-4 rounded-xl p-[3px]" style={{ background: 'rgba(120,120,128,0.16)' }}>
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="py-1.5 rounded-lg text-[13px] font-medium transition-all capitalize"
                  style={type === t
                    ? { background: 'rgba(118,118,128,0.24)', color: '#fff' }
                    : { background: 'transparent', color: 'rgba(235,235,245,0.55)' }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(235,235,245,0.45)' }}>
              Starting balance
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[24px] font-semibold" style={{ color: 'rgba(235,235,245,0.5)' }}>$</span>
              <input
                inputMode="decimal"
                type="text"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value.replace(/[^0-9.\-]/g, ''))}
                className="flex-1 bg-transparent text-[28px] font-semibold outline-none text-white"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(235,235,245,0.45)' }}>
              Starting date
            </span>
            <input
              type="date"
              value={startingDate}
              onChange={(e) => setStartingDate(e.target.value)}
              className="mt-1 w-full bg-[rgba(120,120,128,0.12)] rounded-lg px-3 py-2 text-[14px] text-white outline-none"
            />
          </label>

          {error && <p className="text-[13px]" style={{ color: '#ff453a' }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[14px] font-medium"
              style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.85)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-semibold disabled:opacity-50"
              style={{ background: '#0a84ff', color: '#fff' }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
