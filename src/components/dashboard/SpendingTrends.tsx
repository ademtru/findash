'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#0a84ff', '#bf5af2', '#30d158', '#ff9f0a', '#ff453a', '#40c8e0']

interface MonthlyCategory {
  month: string
  [category: string]: number | string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl p-3 text-[13px]"
      style={{ background: '#2c2c2e', border: '0.5px solid rgba(84,84,88,0.6)' }}
    >
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="truncate max-w-[80px]" style={{ color: 'rgba(235,235,245,0.6)' }}>{p.name}:</span>
          <span className="text-white font-semibold tabular-nums">${Number(p.value).toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

export function SpendingTrends({ data, categories }: { data: MonthlyCategory[]; categories: string[] }) {
  return (
    <div className="ios-card p-5">
      <p className="text-[13px] font-semibold text-white mb-4">Trends by Category</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="rgba(84,84,88,0.25)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'rgba(235,235,245,0.4)', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(235,235,245,0.4)', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
