'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from 'next/navigation'

const COLORS = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

interface CategoryData {
  category: string
  amount: number
}

interface SpendingDonutProps {
  data: CategoryData[]
  month?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/10">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-cyan-400">${payload[0].value.toFixed(2)}</p>
      <p className="text-slate-500 mt-1">Click to drill down →</p>
    </div>
  )
}

export function SpendingDonut({ data, month }: SpendingDonutProps) {
  const router = useRouter()
  const total = data.reduce((s, d) => s + d.amount, 0)

  function handleCategoryClick(category: string) {
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    params.set('category', category)
    router.push(`/transactions?${params.toString()}`)
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Spending</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              strokeWidth={0}
              onClick={(entry) => handleCategoryClick(entry.category)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-bold text-white">${(total/1000).toFixed(1)}k</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">total</p>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5 mt-4">
        {data.slice(0, 6).map((d, i) => (
          <button
            key={d.category}
            onClick={() => handleCategoryClick(d.category)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[11px] text-slate-400 truncate hover:text-slate-200 transition-colors">{d.category}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
