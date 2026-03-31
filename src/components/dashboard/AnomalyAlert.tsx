import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Anomaly } from '@/types/transaction'

const SEVERITY_CONFIG = {
  high:   { icon: AlertCircle,   color: 'text-red-400',   bg: 'rgba(239,68,68,0.1)',   label: 'High' },
  medium: { icon: AlertTriangle, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)',  label: 'Medium' },
  low:    { icon: Info,          color: 'text-blue-400',  bg: 'rgba(59,130,246,0.1)',  label: 'Low' },
}

export function AnomalyAlert({ anomaly }: { anomaly: Anomaly }) {
  const { icon: Icon, color, bg, label } = SEVERITY_CONFIG[anomaly.severity]
  return (
    <div className="glass rounded-2xl px-4 py-3.5 flex items-start gap-3">
      <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: bg }}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-200">{anomaly.description}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide ${color}`}
            style={{ background: bg }}>{label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{format(parseISO(anomaly.date), 'MMM d, yyyy')}</p>
      </div>
    </div>
  )
}
