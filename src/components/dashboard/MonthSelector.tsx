'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface MonthSelectorProps {
  months: string[] // YYYY-MM strings, sorted newest first (have data)
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthSelector({ months }: MonthSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get('month') || undefined
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentIdx = selectedMonth ? months.indexOf(selectedMonth) : -1

  function navigate(month: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (month) params.set('month', month)
    else params.delete('month')
    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open])

  const canGoOlder = selectedMonth ? currentIdx < months.length - 1 : months.length > 0
  const canGoNewer = selectedMonth ? currentIdx > 0 : false

  // Group months by year for the grid
  const yearMap: Record<string, Set<number>> = {}
  for (const m of months) {
    const [year, monthNum] = m.split('-')
    if (!yearMap[year]) yearMap[year] = new Set()
    yearMap[year].add(parseInt(monthNum))
  }
  const years = Object.keys(yearMap).sort((a, b) => b.localeCompare(a))

  return (
    <div ref={containerRef} className="relative">
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

          <button
            onClick={() => setOpen(v => !v)}
            className="text-sm font-semibold text-white min-w-[130px] text-center hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {selectedMonth
              ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
              : 'All time'}
          </button>

          <button
            onClick={() => { if (canGoNewer) navigate(months[currentIdx - 1]) }}
            disabled={!canGoNewer}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="w-20" />
      </div>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 rounded-2xl p-4 border border-white/10 shadow-2xl min-w-[340px]" style={{ background: 'rgb(10, 14, 23)' }}>
          {years.map(year => (
            <div key={year} className="mb-3 last:mb-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{year}</p>
              <div className="grid grid-cols-6 gap-1">
                {MONTH_LABELS.map((label, idx) => {
                  const monthNum = idx + 1
                  const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`
                  const hasData = yearMap[year]?.has(monthNum)
                  const isSelected = selectedMonth === monthStr

                  return (
                    <button
                      key={label}
                      onClick={() => hasData && navigate(monthStr)}
                      disabled={!hasData}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-default ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : hasData
                            ? 'text-slate-300 hover:bg-white/[0.08] hover:text-white border border-transparent'
                            : 'text-slate-700 opacity-30 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
