'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'

interface MonthPoint {
  month: number
  value: number
}

interface ProjectionChartProps {
  series: MonthPoint[]
  fireNumber: number
  portfolio: number
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const month = payload[0].payload.month as number
  const value = payload[0].value as number
  const years = month / 12
  return (
    <div
      className="rounded-xl p-3 text-[12px]"
      style={{ background: '#2c2c2e', border: '0.5px solid rgba(84,84,88,0.6)' }}
    >
      <p className="font-semibold text-white">{years.toFixed(1)} yrs out</p>
      <p style={{ color: 'rgba(235,235,245,0.6)' }} className="tabular-nums">
        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  )
}

export function ProjectionChart({ series, fireNumber, portfolio }: ProjectionChartProps) {
  // Subsample to yearly points for performance on long projections.
  const data = series
    .filter((p) => p.month % 12 === 0 || p.month === series[series.length - 1]?.month)
    .map((p) => ({ ...p, year: p.month / 12 }))

  return (
    <div className="ios-card p-5">
      <p className="text-[13px] font-semibold text-white mb-4">Projection</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="rgba(84,84,88,0.25)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: 'rgba(235,235,245,0.4)', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}y`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(235,235,245,0.4)', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtAxis}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
          {Number.isFinite(fireNumber) && (
            <ReferenceLine
              y={fireNumber}
              stroke="#bf5af2"
              strokeDasharray="4 4"
              label={{
                value: 'FIRE',
                position: 'insideTopRight',
                fill: '#bf5af2',
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0a84ff"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot x={0} y={portfolio} r={4} fill="#30d158" stroke="none" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
