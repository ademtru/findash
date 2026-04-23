import { listInsights } from '@/db/queries/insights'
import { InsightsView } from './InsightsView'
import { Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const [weekly, monthly] = await Promise.all([
    listInsights('weekly', 12),
    listInsights('monthly', 12),
  ])

  const serial = (rows: typeof weekly) =>
    rows.map((r) => ({
      id: r.id,
      periodType: r.periodType,
      periodKey: r.periodKey,
      generatedAt: r.generatedAt.toISOString(),
      model: r.model,
      narrative: r.narrative,
      summaryJson: r.summaryJson,
    }))

  if (weekly.length === 0 && monthly.length === 0) {
    return (
      <div className="px-4 py-5 md:px-6 md:py-6 flex flex-col items-center justify-center py-24 text-center space-y-3">
        <div className="p-4 rounded-full" style={{ background: 'rgba(120,120,128,0.18)' }}>
          <Sparkles className="h-8 w-8" style={{ color: 'rgba(235,235,245,0.3)' }} />
        </div>
        <h1 className="text-[22px] font-bold text-white">No insights yet</h1>
        <p className="text-[14px] max-w-xs" style={{ color: 'rgba(235,235,245,0.5)' }}>
          Insights generate automatically every Sunday night and on the 1st of each month. Or hit regenerate below.
        </p>
        <InsightsView weekly={[]} monthly={[]} emptyCta />
      </div>
    )
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-[28px] font-bold text-white tracking-tight">AI Insights</h1>
        <p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
          Auto-generated weekly on Sunday nights and monthly on the 1st.
        </p>
      </div>
      <InsightsView weekly={serial(weekly)} monthly={serial(monthly)} />
    </div>
  )
}
