import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Trend, MonthlyInsight } from '@/types/transaction'

export function MonthlyNarrativeCard({ insight }: { insight: MonthlyInsight }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{insight.month}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{insight.narrative}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Savings rate</span>
          <span className={`text-xs font-semibold ${insight.savings_rate > 0.2 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(insight.savings_rate * 100).toFixed(1)}%
          </span>
        </div>
        {insight.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {insight.highlights.map((h, i) => (
              <span key={i} className="px-2 py-0.5 bg-muted/50 rounded-full text-xs text-muted-foreground">{h}</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TrendCard({ trend }: { trend: Trend }) {
  const Icon = trend.direction === 'positive' ? TrendingUp : trend.direction === 'negative' ? TrendingDown : Minus
  const color = trend.direction === 'positive' ? 'text-emerald-400' : trend.direction === 'negative' ? 'text-red-400' : 'text-muted-foreground'
  const bg = trend.direction === 'positive' ? 'bg-emerald-400/10' : trend.direction === 'negative' ? 'bg-red-400/10' : 'bg-muted/30'

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="py-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bg} shrink-0 mt-0.5`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-sm leading-relaxed">{trend.description}</p>
      </CardContent>
    </Card>
  )
}
