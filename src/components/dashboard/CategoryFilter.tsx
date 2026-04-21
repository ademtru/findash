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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all cursor-pointer"
            style={
              isActive
                ? { background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }
                : { background: 'rgba(120,120,128,0.18)', color: 'rgba(235,235,245,0.6)' }
            }
          >
            {cat}
            {isActive && <span className="text-[#0a84ff] opacity-70 leading-none">×</span>}
          </button>
        )
      })}
    </div>
  )
}
