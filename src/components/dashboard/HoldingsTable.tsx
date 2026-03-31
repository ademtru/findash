import { Card, CardContent } from '@/components/ui/card'

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
      <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticker</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Shares</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Cost Basis</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Portfolio %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {holdings.map(h => (
              <tr key={h.ticker} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-bold text-primary">{h.ticker}</td>
                <td className="px-4 py-3 text-right tabular-nums">{h.shares.toFixed(4)}</td>
                <td className="px-4 py-3 text-right tabular-nums">${h.cost.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No holdings found</div>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {holdings.map(h => (
          <Card key={h.ticker} className="bg-card/50 border-border/50">
            <CardContent className="py-3 px-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-primary">{h.ticker}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{h.shares.toFixed(4)} shares</p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">${h.cost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {totalCost > 0 ? ((h.cost / totalCost) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {holdings.length === 0 && (
          <p className="text-center py-12 text-muted-foreground text-sm">No holdings found</p>
        )}
      </div>
    </>
  )
}
