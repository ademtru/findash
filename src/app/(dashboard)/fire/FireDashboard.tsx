'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Flame, RotateCcw, Check } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { fetchJson } from '@/lib/fetch-json'
import {
  computeFireNumber,
  computeYearsToFire,
  computeCoastFire,
  type FireSettings,
} from '@/lib/fire'
import { ProjectionChart } from './ProjectionChart'

function fmtMoney(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—'
  return `$${Math.round(n / Math.pow(10, -decimals)).toLocaleString(undefined, { maximumFractionDigits: decimals })}`
}

function fmtYears(y: number): string {
  if (!Number.isFinite(y)) return '∞'
  if (y < 1) return `${Math.round(y * 12)} mo`
  if (y < 10) return `${y.toFixed(1)} yrs`
  return `${Math.round(y)} yrs`
}

interface FireDashboardProps {
  portfolio: number
  annualExpenseDerived: number
  monthlyContributionDerived: number
  initialSettings: FireSettings
}

export function FireDashboard({
  portfolio,
  annualExpenseDerived,
  monthlyContributionDerived,
  initialSettings,
}: FireDashboardProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlash = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived numbers
  const annualExpenses = settings.annualExpenseOverride ?? annualExpenseDerived
  const monthlyContribution = settings.monthlyContributionOverride ?? monthlyContributionDerived
  const fireNumber = computeFireNumber(annualExpenses, settings.withdrawalRate)
  const projection = useMemo(
    () => computeYearsToFire(portfolio, monthlyContribution, fireNumber, settings.realReturnRate),
    [portfolio, monthlyContribution, fireNumber, settings.realReturnRate],
  )
  const coast = useMemo(
    () => computeCoastFire(portfolio, fireNumber, settings.currentAge, settings.targetRetirementAge, settings.realReturnRate),
    [portfolio, fireNumber, settings.currentAge, settings.targetRetirementAge, settings.realReturnRate],
  )

  function updateSettings(patch: Partial<FireSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  // Debounced save
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      const { ok } = await fetchJson('/api/fire-settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (ok) {
        setSaveState('saved')
        if (savedFlash.current) clearTimeout(savedFlash.current)
        savedFlash.current = setTimeout(() => setSaveState('idle'), 1500)
      } else {
        setSaveState('idle')
      }
    }, 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [settings])

  const progressPct = Math.max(0, Math.min(100, (portfolio / fireNumber) * 100))

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Portfolio" value={fmtMoney(portfolio)} />
        <StatCard title="FIRE Number" value={fmtMoney(fireNumber)} accent="cyan" />
        <StatCard
          title="Years to FIRE"
          value={fmtYears(projection.years)}
          accent={projection.years === 0 ? 'emerald' : 'violet'}
        />
        <StatCard
          title="Coast"
          value={coast.alreadyCoasting ? 'On track' : fmtMoney(coast.coastNumberToday)}
          subtitle={
            coast.alreadyCoasting
              ? 'Stop contributing today, still hit FIRE'
              : 'Need this much to coast'
          }
          accent={coast.alreadyCoasting ? 'emerald' : 'default'}
        />
      </div>

      {/* Progress bar */}
      <div className="ios-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4" style={{ color: '#ff9f0a' }} />
            <p className="text-[13px] font-semibold text-white">Progress to FIRE</p>
          </div>
          <p className="text-[13px] tabular-nums" style={{ color: 'rgba(235,235,245,0.65)' }}>
            {progressPct.toFixed(1)}%
          </p>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(120,120,128,0.2)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 100
                ? '#30d158'
                : 'linear-gradient(90deg, #0a84ff, #bf5af2)',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
          <span>{fmtMoney(portfolio)}</span>
          <span>{fmtMoney(fireNumber)}</span>
        </div>
      </div>

      {/* Projection chart */}
      <ProjectionChart
        series={projection.monthlySeries}
        fireNumber={fireNumber}
        portfolio={portfolio}
      />

      {/* Assumptions */}
      <div className="ios-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white">Assumptions</p>
          <SaveIndicator state={saveState} />
        </div>

        <SliderRow
          label="Withdrawal rate"
          value={settings.withdrawalRate}
          min={0.02}
          max={0.06}
          step={0.0025}
          format={(v) => `${(v * 100).toFixed(2)}%`}
          onChange={(v) => updateSettings({ withdrawalRate: v })}
        />

        <SliderRow
          label="Real return rate"
          value={settings.realReturnRate}
          min={0.02}
          max={0.12}
          step={0.0025}
          format={(v) => `${(v * 100).toFixed(2)}%`}
          onChange={(v) => updateSettings({ realReturnRate: v })}
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberRow
            label="Current age"
            value={settings.currentAge}
            min={0}
            max={120}
            onChange={(v) => updateSettings({ currentAge: v })}
          />
          <NumberRow
            label="Target retirement age"
            value={settings.targetRetirementAge}
            min={0}
            max={120}
            onChange={(v) => updateSettings({ targetRetirementAge: v })}
          />
        </div>
      </div>

      {/* Overrides */}
      <div className="ios-card p-5 space-y-4">
        <p className="text-[13px] font-semibold text-white">Inputs</p>

        <OverrideRow
          label="Annual expenses"
          derived={annualExpenseDerived}
          override={settings.annualExpenseOverride}
          onChange={(v) => updateSettings({ annualExpenseOverride: v })}
          unit="$"
        />

        <OverrideRow
          label="Monthly contribution"
          derived={monthlyContributionDerived}
          override={settings.monthlyContributionOverride}
          onChange={(v) => updateSettings({ monthlyContributionOverride: v })}
          unit="$"
        />
      </div>

      {/* Coast FIRE block */}
      <div className="ios-card p-5 space-y-2">
        <p className="text-[13px] font-semibold text-white">Coast FIRE</p>
        <p className="text-[13px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
          {coast.alreadyCoasting ? (
            <>
              You can stop contributing today and still hit FIRE around age{' '}
              <span className="text-white font-semibold">
                {Number.isFinite(coast.coastAge) ? coast.coastAge.toFixed(1) : '∞'}
              </span>
              . If you do nothing more, your portfolio grows to{' '}
              <span className="text-white font-semibold">
                {fmtMoney(coast.projectedAtTargetAge)}
              </span>{' '}
              by age {settings.targetRetirementAge}.
            </>
          ) : (
            <>
              You need{' '}
              <span className="text-white font-semibold">
                {fmtMoney(coast.coastNumberToday)}
              </span>{' '}
              invested today to coast (no further contributions) to your FIRE number by age{' '}
              {settings.targetRetirementAge}. You&apos;re at{' '}
              <span className="text-white font-semibold">{fmtMoney(portfolio)}</span>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'idle') return null
  if (state === 'saving') {
    return (
      <span className="text-[11px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
        Saving…
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(48,209,88,0.9)' }}>
      <Check className="h-3 w-3" /> Saved
    </span>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>{label}</span>
        <span className="text-[13px] font-semibold text-white tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#0a84ff]"
      />
    </div>
  )
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (Number.isFinite(n)) onChange(n)
        }}
        className="mt-1 w-full bg-[rgba(120,120,128,0.12)] rounded-lg px-3 py-2 text-[14px] text-white outline-none tabular-nums"
      />
    </label>
  )
}

function OverrideRow({
  label,
  derived,
  override,
  onChange,
  unit,
}: {
  label: string
  derived: number
  override: number | null
  onChange: (v: number | null) => void
  unit?: string
}) {
  const value = override ?? derived
  const isOverride = override !== null

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>
          {label}
          <span className="ml-1.5 text-[10px]"
            style={{ color: 'rgba(235,235,245,0.35)' }}>
            (derived: {unit}{Math.round(derived).toLocaleString()})
          </span>
        </span>
        {isOverride && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-[11px]"
            style={{ color: '#0a84ff' }}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {unit && (
          <span className="text-[15px]" style={{ color: 'rgba(235,235,245,0.5)' }}>{unit}</span>
        )}
        <input
          type="number"
          min={0}
          step={100}
          value={Math.round(value)}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            onChange(Number.isFinite(n) ? n : null)
          }}
          className="flex-1 bg-[rgba(120,120,128,0.12)] rounded-lg px-3 py-2 text-[14px] text-white outline-none tabular-nums"
        />
      </div>
    </div>
  )
}
