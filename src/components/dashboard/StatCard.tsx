import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: 'cyan' | 'violet' | 'emerald' | 'default'
}

export function StatCard({ title, value, subtitle, trend, accent = 'default' }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'

  const accentBar = {
    cyan: 'from-cyan-500 to-cyan-400',
    violet: 'from-violet-500 to-violet-400',
    emerald: 'from-emerald-500 to-emerald-400',
    default: 'from-slate-600 to-slate-500',
  }[accent]

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group cursor-default transition-all duration-300 hover:glow-cyan">
      {/* Top accent line */}
      <div className={cn('absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r opacity-60', accentBar)} />

      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-3">{title}</p>
      <p className={cn(
        'text-2xl font-bold tracking-tight',
        accent === 'cyan' ? 'gradient-text' : 'text-white'
      )}>
        {value}
      </p>
      {subtitle && (
        <div className={cn('flex items-center gap-1.5 mt-2', trendColor)}>
          {trend && <TrendIcon className="h-3 w-3" />}
          <span className="text-xs">{subtitle}</span>
        </div>
      )}
    </div>
  )
}
