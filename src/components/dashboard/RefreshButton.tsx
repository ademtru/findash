'use client'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <button
      onClick={handleRefresh}
      className="p-2 rounded-[10px] transition-colors cursor-pointer active:opacity-60"
      style={{ background: 'rgba(120,120,128,0.18)' }}
      aria-label="Refresh data"
    >
      <RotateCcw
        className={`h-[17px] w-[17px] transition-colors ${spinning ? 'animate-spin' : ''}`}
        style={{ color: 'rgba(235,235,245,0.6)' }}
      />
    </button>
  )
}
