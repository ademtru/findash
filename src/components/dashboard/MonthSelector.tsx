'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  months: string[] // YYYY-MM strings, sorted newest first
}

export function MonthSelector({ months }: MonthSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get('month') ?? undefined

  const currentIdx = selectedMonth ? months.indexOf(selectedMonth) : -1

  function navigate(month: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (month) params.set('month', month)
    else params.delete('month')
    router.push(`?${params.toString()}`)
  }

  const canGoOlder = selectedMonth ? currentIdx < months.length - 1 : months.length > 0
  const canGoNewer = selectedMonth ? currentIdx > 0 : false

  return (
    <div className="flex items-center justify-between glass rounded-2xl px-5 py-3.5">
      <button
        onClick={() => navigate(null)}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
          !selectedMonth
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
            : 'text-slate-500 hover:text-slate-300 border border-transparent'
        }`}
      >
        All time
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(selectedMonth ? months[currentIdx + 1] : months[0])}
          disabled={!canGoOlder}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-default"
        >
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </button>

        <p className="text-sm font-semibold text-white min-w-[130px] text-center">
          {selectedMonth
            ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
            : 'All time'}
        </p>

        <button
          onClick={() => canGoNewer ? navigate(months[currentIdx - 1]) : undefined}
          disabled={!canGoNewer}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-default"
        >
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <div className="w-20" />
    </div>
  )
}
