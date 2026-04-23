'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'

interface InsightSerial {
  id: string
  periodType: string
  periodKey: string
  generatedAt: string
  model: string
  narrative: string
  summaryJson: unknown
}

interface Summary {
  savings_rate?: number
  highlights?: string[]
  anomalies?: Array<{ date: string; description: string; severity: 'low' | 'medium' | 'high' }>
  trends?: Array<{ type: string; description: string; direction: 'positive' | 'negative' | 'neutral' }>
  investments?: Array<{ ticker: string; commentary: string }>
}

export function InsightsView({
  weekly,
  monthly,
  emptyCta,
}: {
  weekly: InsightSerial[]
  monthly: InsightSerial[]
  emptyCta?: boolean
}) {
  const [tab, setTab] = useState<'weekly' | 'monthly'>(weekly.length >= monthly.length ? 'weekly' : 'monthly')
  const rows = tab === 'weekly' ? weekly : monthly
  const [selectedKey, setSelectedKey] = useState<string | null>(rows[0]?.periodKey ?? null)

  const selected = rows.find((r) => r.periodKey === selectedKey) ?? rows[0] ?? null

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 rounded-xl p-[3px] max-w-xs"
        style={{ background: 'rgba(120,120,128,0.16)' }}
      >
        {(['weekly', 'monthly'] as const).map((t) => {
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                const next = t === 'weekly' ? weekly : monthly
                setSelectedKey(next[0]?.periodKey ?? null)
              }}
              className="py-1.5 rounded-lg text-[13px] font-medium capitalize transition-all"
              style={{
                background: active ? 'rgba(118,118,128,0.24)' : 'transparent',
                color: active ? '#fff' : 'rgba(235,235,245,0.55)',
              }}
            >
              {t}
            </button>
          )
        })}
      </div>

      {emptyCta && (
        <RegenerateButton kind={tab} />
      )}

      {rows.length > 0 && (
        <div className="grid md:grid-cols-[200px_1fr] gap-4">
          <aside
            className="ios-card p-1 overflow-x-auto md:overflow-visible"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex md:flex-col gap-1">
              {rows.map((r) => {
                const active = r.periodKey === selected?.periodKey
                return (
                  <button
                    key={r.periodKey}
                    type="button"
                    onClick={() => setSelectedKey(r.periodKey)}
                    className="text-left px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors"
                    style={{
                      background: active ? 'rgba(10,132,255,0.15)' : 'transparent',
                      color: active ? '#0a84ff' : 'rgba(235,235,245,0.7)',
                    }}
                  >
                    {r.periodKey}
                  </button>
                )
              })}
            </div>
          </aside>

          {selected && <InsightDetail insight={selected} />}
        </div>
      )}

      {rows.length > 0 && (
        <RegenerateButton kind={tab} periodKey={selected?.periodKey} />
      )}
    </div>
  )
}

function InsightDetail({ insight }: { insight: InsightSerial }) {
  const s = (insight.summaryJson ?? {}) as Summary
  const savingsRate = typeof s.savings_rate === 'number' ? s.savings_rate : 0

  return (
    <div className="space-y-4">
      <div className="ios-card p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'rgba(235,235,245,0.4)' }}
          >
            {insight.periodKey}
          </p>
          <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
            {new Date(insight.generatedAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </p>
        </div>

        <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: 'rgba(235,235,245,0.9)' }}>
          {insight.narrative}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.4)' }}>Savings rate</span>
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: savingsRate > 0.2 ? '#30d158' : savingsRate > 0 ? '#ff9f0a' : '#ff453a' }}
          >
            {(savingsRate * 100).toFixed(1)}%
          </span>
        </div>

        {s.highlights && s.highlights.length > 0 && (
          <ul className="space-y-1 pt-2 text-[14px] leading-relaxed" style={{ color: 'rgba(235,235,245,0.75)' }}>
            {s.highlights.map((h, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: '#0a84ff' }}>·</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {s.anomalies && s.anomalies.length > 0 && (
        <section>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgba(235,235,245,0.4)' }}
          >
            Anomalies
          </p>
          <div className="space-y-2">
            {s.anomalies.map((a, i) => <AnomalyRow key={i} anomaly={a} />)}
          </div>
        </section>
      )}

      {s.trends && s.trends.length > 0 && (
        <section>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgba(235,235,245,0.4)' }}
          >
            Trends
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {s.trends.map((t, i) => <TrendRow key={i} trend={t} />)}
          </div>
        </section>
      )}

      {s.investments && s.investments.length > 0 && (
        <section>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'rgba(235,235,245,0.4)' }}
          >
            Investments
          </p>
          <div className="space-y-2">
            {s.investments.map((inv, i) => (
              <div key={i} className="ios-card p-4">
                <p className="text-[13px] font-bold mb-1" style={{ color: '#0a84ff' }}>{inv.ticker}</p>
                <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(235,235,245,0.75)' }}>
                  {inv.commentary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AnomalyRow({ anomaly }: { anomaly: NonNullable<Summary['anomalies']>[number] }) {
  const palette =
    anomaly.severity === 'high' ? { c: '#ff453a', b: 'rgba(255,69,58,0.15)' } :
    anomaly.severity === 'medium' ? { c: '#ff9f0a', b: 'rgba(255,159,10,0.15)' } :
    { c: '#0a84ff', b: 'rgba(10,132,255,0.15)' }
  return (
    <div className="ios-card px-4 py-3 flex items-start gap-3">
      <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: palette.c, background: palette.b }}
      >
        {anomaly.severity}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-white">{anomaly.description}</p>
        <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.4)' }}>{anomaly.date}</p>
      </div>
    </div>
  )
}

function TrendRow({ trend }: { trend: NonNullable<Summary['trends']>[number] }) {
  const Icon = trend.direction === 'positive' ? TrendingUp : trend.direction === 'negative' ? TrendingDown : Minus
  const color =
    trend.direction === 'positive' ? '#30d158' :
    trend.direction === 'negative' ? '#ff453a' :
    'rgba(235,235,245,0.55)'
  const bg =
    trend.direction === 'positive' ? 'rgba(48,209,88,0.15)' :
    trend.direction === 'negative' ? 'rgba(255,69,58,0.15)' :
    'rgba(120,120,128,0.18)'
  return (
    <div className="ios-card p-3 flex items-start gap-2.5">
      <div className="p-1.5 rounded-[6px] shrink-0 mt-0.5" style={{ background: bg }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(235,235,245,0.75)' }}>
        {trend.description}
      </p>
    </div>
  )
}

function RegenerateButton({ kind, periodKey }: { kind: 'weekly' | 'monthly'; periodKey?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setBusy(true)
    setError(null)
    const { ok, error: err } = await fetchJson('/api/insights/regenerate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, periodKey, force: true }),
    })
    setBusy(false)
    if (!ok) {
      setError(err ?? 'Failed')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium"
        style={{ background: 'rgba(10,132,255,0.14)', color: '#0a84ff' }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {busy ? 'Generating…' : periodKey ? `Regenerate ${periodKey}` : `Generate ${kind === 'weekly' ? 'last week' : 'last month'}`}
      </button>
      {error && <span className="text-[12px]" style={{ color: '#ff453a' }}>{error}</span>}
    </div>
  )
}
