'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from 'next/navigation'

const COLORS = ['#0a84ff', '#bf5af2', '#30d158', '#ff9f0a', '#ff453a', '#40c8e0']

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
    <div
      className="rounded-xl p-3 text-[13px]"
      style={{ background: '#2c2c2e', border: '0.5px solid rgba(84,84,88,0.6)' }}
    >
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="tabular-nums mt-0.5" style={{ color: '#0a84ff' }}>
        ${payload[0].value.toFixed(2)}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: 'rgba(235,235,245,0.4)' }}>
        Tap to drill down
      </p>
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
    <div className="ios-card p-5">
      <p className="text-[13px] font-semibold text-white mb-4">Spending</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
              onClick={(entry) => handleCategoryClick((entry as unknown as CategoryData).category)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[18px] font-bold text-white tabular-nums">${(total / 1000).toFixed(1)}k</p>
          <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.4)' }}>total</p>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 mt-4">
        {data.slice(0, 6).map((d, i) => (
          <button
            key={d.category}
            onClick={() => handleCategoryClick(d.category)}
            className="flex items-center gap-2 text-left cursor-pointer active:opacity-60 transition-opacity"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[12px] truncate" style={{ color: 'rgba(235,235,245,0.6)' }}>
              {d.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
