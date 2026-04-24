'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { fetchJson } from '@/lib/fetch-json'

interface Props {
  batchId: string
  initialStatus: string
}

export function BatchPoller({ batchId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    let stopped = false

    async function start() {
      // Fire the run endpoint — idempotent, safe to call even if already extracting
      await fetchJson(`/api/extract/${batchId}/run`, { method: 'POST' })

      while (!stopped) {
        await new Promise((r) => setTimeout(r, 3000))
        const { ok, data } = await fetchJson<{ batch: { status: string; error?: string } }>(
          `/api/extract/${batchId}`,
        )
        if (!ok || !data) continue

        const s = data.batch.status
        setStatus(s)

        if (s === 'review' || s === 'committed' || s === 'discarded') {
          router.refresh()
          return
        }
        if (s === 'failed') {
          setError(data.batch.error ?? 'Extraction failed')
          return
        }
      }
    }

    start()
    return () => { stopped = true }
  }, [batchId, router])

  if (status === 'failed' && error) {
    return (
      <div
        className="rounded-xl p-4 text-[14px]"
        style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
      >
        Extraction failed: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0a84ff' }} />
      <p className="text-[14px]" style={{ color: 'rgba(235,235,245,0.7)' }}>
        {status === 'extracting' ? 'Extracting transactions…' : 'Starting extraction…'}
      </p>
      <p className="text-[12px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
        You can navigate away — this runs in the background.
      </p>
    </div>
  )
}
