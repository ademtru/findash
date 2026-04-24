'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import type { AccountRow } from '@/db/schema'
import { fetchJson } from '@/lib/fetch-json'

export function AccountsSettings({ initial }: { initial: AccountRow[] }) {
  const [accounts, setAccounts] = useState(initial)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [last4, setLast4] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAdding(true)
    const { ok, data, error: err } = await fetchJson<{ account: AccountRow }>('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, institution: institution || undefined, last4 }),
    })
    setAdding(false)
    if (!ok || !data) {
      setError(err ?? 'Failed to add account')
      return
    }
    setAccounts((prev) => [...prev, data.account])
    setName('')
    setInstitution('')
    setLast4('')
  }

  async function handleDelete(id: string) {
    const { ok } = await fetchJson(`/api/accounts/${id}`, { method: 'DELETE' })
    if (ok) setAccounts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
            No accounts added yet.
          </p>
        ) : (
          accounts.map((a) => (
            <div
              key={a.id}
              className="ios-card px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-white truncate">{a.name}</p>
                <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
                  {a.institution ? `${a.institution} · ` : ''}••••{a.last4}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,69,58,0.15)] transition-colors"
                style={{ color: 'rgba(235,235,245,0.4)' }}
                aria-label={`Remove ${a.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
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

        {error && (
          <p className="text-[13px]" style={{ color: '#ff453a' }}>{error}</p>
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
    </div>
  )
}
