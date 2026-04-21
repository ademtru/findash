import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { MonthlyNarrativeCard, TrendCard } from '@/components/dashboard/InsightCard'
import { AnomalyAlert } from '@/components/dashboard/AnomalyAlert'
import { Sparkles } from 'lucide-react'
import { getInsights } from '@/lib/data'

export default async function InsightsPage() {
  const insights = await getInsights()

  const hasContent =
    insights.anomalies?.length > 0 ||
    insights.trends?.length > 0 ||
    insights.monthly?.length > 0 ||
    insights.investments?.length > 0

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">AI Insights</h1>
          {insights.generated_at && (
            <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
              Updated {new Date(insights.generated_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <RefreshButton />
      </div>

      {!hasContent && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <div className="p-4 rounded-full" style={{ background: 'rgba(120,120,128,0.18)' }}>
            <Sparkles className="h-8 w-8" style={{ color: 'rgba(235,235,245,0.3)' }} />
          </div>
          <p className="text-[14px] max-w-xs" style={{ color: 'rgba(235,235,245,0.4)' }}>
            No insights yet. Upload your transactions and generate insights.
          </p>
        </div>
      )}

      {insights.anomalies?.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide px-1" style={{ color: 'rgba(235,235,245,0.4)' }}>
            Anomalies
          </p>
          {insights.anomalies.map((a, i) => <AnomalyAlert key={i} anomaly={a} />)}
        </section>
      )}

      {insights.trends?.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide px-1" style={{ color: 'rgba(235,235,245,0.4)' }}>
            Trends
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.trends.map((t, i) => <TrendCard key={i} trend={t} />)}
          </div>
        </section>
      )}

      {insights.monthly?.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide px-1" style={{ color: 'rgba(235,235,245,0.4)' }}>
            Monthly Summaries
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...insights.monthly].reverse().map((m, i) => <MonthlyNarrativeCard key={i} insight={m} />)}
          </div>
        </section>
      )}

      {insights.investments?.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide px-1" style={{ color: 'rgba(235,235,245,0.4)' }}>
            Investment Commentary
          </p>
          <div className="space-y-2">
            {insights.investments.map((inv, i) => (
              <div key={i} className="ios-card p-4">
                <p className="text-[13px] font-bold mb-1" style={{ color: '#0a84ff' }}>{inv.ticker}</p>
                <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(235,235,245,0.7)' }}>
                  {inv.commentary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
