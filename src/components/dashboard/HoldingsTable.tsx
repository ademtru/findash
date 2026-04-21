interface Holding {
  ticker: string
  shares: number
  cost: number
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
              {['Ticker', 'Shares', 'Cost Basis', 'Portfolio %'].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide ${i > 0 ? 'text-right' : 'text-left'}`}
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
                <td className="px-5 py-3.5">
                  <span className="font-bold text-[14px]" style={{ color: '#0a84ff' }}>{h.ticker}</span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[14px]"
                  style={{ color: 'rgba(235,235,245,0.7)' }}>
                  {h.shares.toFixed(4)}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-[14px] text-white">
                  ${h.cost.toFixed(2)}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[13px]"
                  style={{ color: 'rgba(235,235,245,0.5)' }}>
                  {totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%
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
                {h.shares.toFixed(4)} shares
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums text-[15px] text-white">${h.cost.toFixed(2)}</p>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.45)' }}>
                {totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%
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
