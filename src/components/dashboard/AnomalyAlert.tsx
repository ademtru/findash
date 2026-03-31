import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Anomaly } from '@/types/transaction'

const SEVERITY_CONFIG = {
  high: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'High' },
  medium: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Medium' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Low' },
}

export function AnomalyAlert({ anomaly }: { anomaly: Anomaly }) {
  const { icon: Icon, color, bg, label } = SEVERITY_CONFIG[anomaly.severity]
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="py-3 px-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bg} shrink-0 mt-0.5`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{anomaly.description}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${bg} ${color} font-medium`}>{label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(anomaly.date), 'MMM d, yyyy')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
