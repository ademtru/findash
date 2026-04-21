import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const ACCENT: Record<string, string> = {
  cyan:    '#0a84ff',
  violet:  '#bf5af2',
  emerald: '#30d158',
  default: '#ffffff',
}

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: 'cyan' | 'violet' | 'emerald' | 'default'
}

export function StatCard({ title, value, subtitle, trend, accent = 'default' }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#30d158' : trend === 'down' ? '#ff453a' : 'rgba(235,235,245,0.4)'

  return (
    <div className="ios-card p-5">
      <p
        className="text-[12px] font-medium leading-tight mb-2 truncate"
        style={{ color: 'rgba(235,235,245,0.55)' }}
      >
        {title}
      </p>

      <p
        className="text-[26px] font-bold tracking-tight tabular-nums leading-none"
        style={{ color: ACCENT[accent] }}
      >
        {value}
      </p>

      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 mt-2.5">
          {trend && <TrendIcon className="h-3 w-3 shrink-0" style={{ color: trendColor }} />}
          {subtitle && (
            <span className="text-[12px]" style={{ color: trendColor }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
