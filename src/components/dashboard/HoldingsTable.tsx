interface Holding {
  ticker: string
  shares: number
  cost: number
  price: number | null
  currentValue: number | null
  gain: number | null
  gainPct: number | null
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function GainCell({ gain, gainPct }: { gain: number | null; gainPct: number | null }) {
  if (gain === null || gainPct === null) return <span style={{ color: 'rgba(235,235,245,0.3)' }}>—</span>
  const positive = gain >= 0
  const color = positive ? '#30d158' : '#ff453a'
  const sign = positive ? '+' : ''
  return (
    <span style={{ color }}>
      {sign}${Math.abs(gain).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      <span className="text-[11px] ml-1 opacity-80">({sign}{gainPct.toFixed(1)}%)</span>
    </span>
  )
}

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const totalCost = holdings.reduce((sum, h) => sum + h.cost, 0)

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block ios-list">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '0.5px solid rgba(84,84,88,0.4)' }}>
              {['Ticker', 'Shares', 'Cost Basis', 'Current Value', 'Gain/Loss'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide ${i > 0 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(235,235,245,0.4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr
                key={h.ticker}
                style={i < holdings.length - 1 ? { borderBottom: '0.5px solid rgba(84,84,88,0.2)' } : {}}
                className="hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <td className="px-4 py-3.5">
                  <span className="font-bold text-[14px]" style={{ color: '#0a84ff' }}>{h.ticker}</span>
                  {h.price !== null && (
                    <span className="block text-[11px] mt-0.5" style={{ color: 'rgba(235,235,245,0.35)' }}>
                      ${fmt(h.price)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-[14px]"
                  style={{ color: 'rgba(235,235,245,0.7)' }}>
                  {h.shares.toFixed(4)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-[14px]"
                  style={{ color: 'rgba(235,235,245,0.7)' }}>
                  ${fmt(h.cost)}
                  <span className="block text-[11px] mt-0.5" style={{ color: 'rgba(235,235,245,0.3)' }}>
                    {totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[14px] text-white">
                  {h.currentValue !== null ? `$${fmt(h.currentValue)}` : '—'}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[14px]">
                  <GainCell gain={h.gain} gainPct={h.gainPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <div className="text-center py-12 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No holdings found
          </div>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden ios-list overflow-hidden">
        {holdings.map((h, i) => (
          <div
            key={h.ticker}
            className="px-4 py-3.5 flex justify-between items-center"
            style={i < holdings.length - 1 ? { borderBottom: '0.5px solid rgba(84,84,88,0.2)' } : {}}
          >
            <div>
              <p className="font-bold text-[15px]" style={{ color: '#0a84ff' }}>{h.ticker}</p>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
                {h.shares.toFixed(4)} sh
                {h.price !== null && ` · $${fmt(h.price)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums text-[15px] text-white">
                {h.currentValue !== null ? `$${fmt(h.currentValue)}` : `$${fmt(h.cost)}`}
              </p>
              <p className="text-[12px] mt-0.5 tabular-nums font-medium">
                <GainCell gain={h.gain} gainPct={h.gainPct} />
              </p>
            </div>
          </div>
        ))}
        {holdings.length === 0 && (
          <p className="text-center py-12 text-[14px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
            No holdings found
          </p>
        )}
      </div>
    </>
  )
}
