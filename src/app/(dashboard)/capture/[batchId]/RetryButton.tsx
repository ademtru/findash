'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { BatchPoller } from './BatchPoller'

export function RetryButton({ batchId }: { batchId: string }) {
  const [retrying, setRetrying] = useState(false)

  if (retrying) {
    return <BatchPoller batchId={batchId} initialStatus="pending" />
  }

  return (
    <button
      type="button"
      onClick={() => setRetrying(true)}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium"
      style={{ background: 'rgba(10,132,255,0.12)', color: '#0a84ff' }}
    >
      <RotateCcw className="h-4 w-4" />
      Retry extraction
    </button>
  )
}
