import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Anomaly } from '@/types/transaction'

const SEVERITY_CONFIG = {
  high:   { icon: AlertCircle,   color: '#ff453a', bg: 'rgba(255,69,58,0.15)',   label: 'High'   },
  medium: { icon: AlertTriangle, color: '#ff9f0a', bg: 'rgba(255,159,10,0.15)',  label: 'Medium' },
  low:    { icon: Info,          color: '#0a84ff', bg: 'rgba(10,132,255,0.15)',  label: 'Low'    },
}

export function AnomalyAlert({ anomaly }: { anomaly: Anomaly }) {
  const { icon: Icon, color, bg, label } = SEVERITY_CONFIG[anomaly.severity]
  return (
    <div className="ios-card px-4 py-3.5 flex items-start gap-3">
      <div className="p-2 rounded-[8px] shrink-0 mt-0.5" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-[14px] font-medium text-white">{anomaly.description}</p>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px] uppercase tracking-wide shrink-0"
            style={{ color, background: bg }}
          >
            {label}
          </span>
        </div>
        <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.4)' }}>
          {format(parseISO(anomaly.date), 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}
