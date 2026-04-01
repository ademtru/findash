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
    // Reset after animation completes
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <button
      onClick={handleRefresh}
      className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
      aria-label="Refresh data"
    >
      <RotateCcw className={`h-4 w-4 text-slate-400 hover:text-slate-200 transition-colors ${spinning ? 'animate-spin' : ''}`} />
    </button>
  )
}
