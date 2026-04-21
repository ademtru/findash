'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MonthData {
  month: string
  income: number
  expenses: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl p-3 text-[13px]"
      style={{ background: '#2c2c2e', border: '0.5px solid rgba(84,84,88,0.6)' }}
    >
      <p className="mb-2 font-semibold text-white">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'rgba(235,235,245,0.6)' }} className="capitalize">{p.name}:</span>
          <span className="text-white font-semibold tabular-nums">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function CashFlowChart({ data }: { data: MonthData[] }) {
  return (
    <div className="ios-card p-5">
      <p className="text-[13px] font-semibold text-white mb-4">Cash Flow</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="income"   fill="#30d158" radius={[5, 5, 0, 0]} name="Income"   maxBarSize={28} />
          <Bar dataKey="expenses" fill="#ff453a" radius={[5, 5, 0, 0]} name="Expenses" maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#30d158]" />
          <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff453a]" />
          <span className="text-[12px]" style={{ color: 'rgba(235,235,245,0.55)' }}>Expenses</span>
        </div>
      </div>
    </div>
  )
}
