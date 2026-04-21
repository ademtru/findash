import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Trend, MonthlyInsight } from '@/types/transaction'

export function MonthlyNarrativeCard({ insight }: { insight: MonthlyInsight }) {
  const isHealthy = insight.savings_rate > 0.2

  return (
    <div className="ios-card p-5 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(235,235,245,0.4)' }}>
        {insight.month}
      </p>
      <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(235,235,245,0.8)' }}>
        {insight.narrative}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[13px]" style={{ color: 'rgba(235,235,245,0.4)' }}>Savings rate</span>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: isHealthy ? '#30d158' : '#ff9f0a' }}>
          {(insight.savings_rate * 100).toFixed(1)}%
        </span>
      </div>
      {insight.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.highlights.map((h, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-[6px] text-[12px]"
              style={{ color: 'rgba(235,235,245,0.55)', background: 'rgba(120,120,128,0.18)' }}
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function TrendCard({ trend }: { trend: Trend }) {
  const Icon = trend.direction === 'positive' ? TrendingUp : trend.direction === 'negative' ? TrendingDown : Minus
  const color = trend.direction === 'positive' ? '#30d158' : trend.direction === 'negative' ? '#ff453a' : 'rgba(235,235,245,0.4)'
  const bg = trend.direction === 'positive' ? 'rgba(48,209,88,0.15)' : trend.direction === 'negative' ? 'rgba(255,69,58,0.15)' : 'rgba(120,120,128,0.18)'

  return (
    <div className="ios-card p-4 flex items-start gap-3">
      <div className="p-2 rounded-[8px] shrink-0 mt-0.5" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(235,235,245,0.75)' }}>
        {trend.description}
      </p>
    </div>
  )
}
