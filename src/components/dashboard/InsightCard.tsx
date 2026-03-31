import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Trend, MonthlyInsight } from '@/types/transaction'

export function MonthlyNarrativeCard({ insight }: { insight: MonthlyInsight }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{insight.month}</p>
      <p className="text-sm text-slate-300 leading-relaxed">{insight.narrative}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Savings rate</span>
        <span className={`text-xs font-bold ${insight.savings_rate > 0.2 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {(insight.savings_rate * 100).toFixed(1)}%
        </span>
      </div>
      {insight.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.highlights.map((h, i) => (
            <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] text-slate-400 border border-white/[0.07] bg-white/[0.03]">{h}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function TrendCard({ trend }: { trend: Trend }) {
  const Icon = trend.direction === 'positive' ? TrendingUp : trend.direction === 'negative' ? TrendingDown : Minus
  const color = trend.direction === 'positive' ? 'text-emerald-400' : trend.direction === 'negative' ? 'text-red-400' : 'text-slate-500'
  const bg = trend.direction === 'positive' ? 'rgba(16,185,129,0.1)' : trend.direction === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'

  return (
    <div className="glass rounded-2xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: bg }}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{trend.description}</p>
    </div>
  )
}
