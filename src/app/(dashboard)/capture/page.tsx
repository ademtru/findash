import { CaptureUploader } from './CaptureUploader'
import { listRecentBatches } from '@/db/queries/batches'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  const recent = await listRecentBatches(10)

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-white tracking-tight">Scan</h1>
        <p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
          Take a screenshot of your banking app, or import a PDF statement or CSV export. AI extracts the transactions — you review and commit.
        </p>
      </div>

      <CaptureUploader />

      {recent.length > 0 && (
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'rgba(235,235,245,0.45)' }}
          >
            Recent
          </h2>
          <div className="ios-card divide-y divide-[rgba(84,84,88,0.3)]">
            {recent.map((b) => (
              <Link
                key={b.id}
                href={`/capture/${b.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <div>
                  <p className="text-[14px] text-white">
                    {b.kind === 'screenshot' ? 'Screenshot' : b.kind.toUpperCase()} batch
                  </p>
                  <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
                    {formatDistanceToNow(b.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <StatusChip status={b.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    review: { bg: 'rgba(10,132,255,0.18)', fg: '#0a84ff' },
    committed: { bg: 'rgba(48,209,88,0.18)', fg: '#30d158' },
    failed: { bg: 'rgba(255,69,58,0.18)', fg: '#ff453a' },
    extracting: { bg: 'rgba(255,159,10,0.18)', fg: '#ff9f0a' },
    discarded: { bg: 'rgba(120,120,128,0.2)', fg: 'rgba(235,235,245,0.55)' },
    pending: { bg: 'rgba(120,120,128,0.2)', fg: 'rgba(235,235,245,0.55)' },
  }
  const palette = colors[status] ?? colors.pending
  return (
    <span
      className="text-[12px] font-medium px-2.5 py-0.5 rounded-full"
      style={{ background: palette.bg, color: palette.fg }}
    >
      {status}
    </span>
  )
}
