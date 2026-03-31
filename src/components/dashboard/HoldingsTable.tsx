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
      <div className="hidden md:block glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Ticker</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Shares</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Cost Basis</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Portfolio %</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr key={h.ticker} className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i === holdings.length - 1 ? 'border-0' : ''}`}>
                <td className="px-5 py-3.5">
                  <span className="font-bold text-cyan-400">{h.ticker}</span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-300">{h.shares.toFixed(4)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-white font-medium">${h.cost.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
                  {totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No holdings found</div>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {holdings.map(h => (
          <div key={h.ticker} className="glass rounded-xl px-4 py-3.5 flex justify-between items-center">
            <div>
              <p className="font-bold text-cyan-400">{h.ticker}</p>
              <p className="text-xs text-slate-500 mt-0.5">{h.shares.toFixed(4)} shares</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums text-white">${h.cost.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%</p>
            </div>
          </div>
        ))}
        {holdings.length === 0 && (
          <p className="text-center py-12 text-slate-600 text-sm">No holdings found</p>
        )}
      </div>
    </>
  )
}
