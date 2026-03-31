'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

interface MonthlyCategory {
  month: string
  [category: string]: number | string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/10">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-300 truncate max-w-[80px]">{p.name}:</span>
          <span className="text-white font-semibold">${Number(p.value).toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

export function SpendingTrends({ data, categories }: { data: MonthlyCategory[]; categories: string[] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Trends by Category</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip content={<CustomTooltip />} />
          {categories.map((cat, i) => (
            <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[i % COLORS.length]}
              dot={false} strokeWidth={2} strokeLinecap="round" />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-4">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[11px] text-slate-400">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
