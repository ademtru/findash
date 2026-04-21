'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface MonthSelectorProps {
  months: string[] // YYYY-MM, sorted newest first
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthSelector({ months }: MonthSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get('month') || undefined
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentIdx = selectedMonth ? months.indexOf(selectedMonth) : -1
  const canGoOlder = selectedMonth ? currentIdx < months.length - 1 : months.length > 0
  const canGoNewer = selectedMonth ? currentIdx > 0 : false

  function navigate(month: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (month) params.set('month', month)
    else params.delete('month')
    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onClickOutside)
      document.addEventListener('keydown', onEsc)
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

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
      {/* Control bar */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: '#1c1c1e' }}
      >
        {/* All time pill */}
        <button
          onClick={() => navigate(null)}
          className="text-[13px] font-medium px-3 py-1.5 rounded-[8px] transition-all cursor-pointer"
          style={
            !selectedMonth
              ? { background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }
              : { color: 'rgba(235,235,245,0.5)', background: 'transparent' }
          }
        >
          All time
        </button>

        {/* Prev / label / Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(selectedMonth ? months[currentIdx + 1] : months[0])}
            disabled={!canGoOlder}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
            style={{ color: 'rgba(235,235,245,0.6)' }}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>

          <button
            onClick={() => setOpen(v => !v)}
            className="text-[15px] font-semibold text-white min-w-[140px] text-center cursor-pointer transition-colors"
            style={{ color: selectedMonth ? '#ffffff' : 'rgba(235,235,245,0.4)' }}
          >
            {selectedMonth ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy') : 'Select month'}
          </button>

          <button
            onClick={() => { if (canGoNewer) navigate(months[currentIdx - 1]) }}
            disabled={!canGoNewer}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
            style={{ color: 'rgba(235,235,245,0.6)' }}
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="w-20" />
      </div>

      {/* Month picker dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:min-w-[340px] top-full mt-2 z-50 rounded-2xl p-4"
          style={{ background: '#2c2c2e', border: '0.5px solid rgba(84,84,88,0.5)' }}
        >
          {years.map(year => (
            <div key={year} className="mb-3 last:mb-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'rgba(235,235,245,0.4)' }}
              >
                {year}
              </p>
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
                      className="px-1 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer disabled:cursor-default"
                      style={
                        isSelected
                          ? { background: 'rgba(10,132,255,0.2)', color: '#0a84ff' }
                          : hasData
                          ? { color: 'rgba(235,235,245,0.8)' }
                          : { color: 'rgba(235,235,245,0.2)', opacity: 0.4 }
                      }
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
