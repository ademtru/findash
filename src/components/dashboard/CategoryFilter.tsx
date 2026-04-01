'use client'
import { useRouter, useSearchParams } from 'next/navigation'

interface CategoryFilterProps {
  categories: string[]
  selectedCategory?: string
}

export function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setCategory(category: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (category) params.set('category', category)
    else params.delete('category')
    router.push(`?${params.toString()}`)
  }

  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => {
        const isActive = selectedCategory === cat
        return (
          <button
            key={cat}
            onClick={() => setCategory(isActive ? null : cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 border border-white/[0.08] hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {cat}
            {isActive && <span className="text-cyan-400/70 hover:text-cyan-300 leading-none">×</span>}
          </button>
        )
      })}
    </div>
  )
}
