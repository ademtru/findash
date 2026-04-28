import YahooFinance from 'yahoo-finance2'
import { unstable_cache } from 'next/cache'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

async function fetchPrice(ticker: string): Promise<number | null> {
  try {
    const quote = await yf.quote(ticker)
    if (quote.regularMarketPrice != null) return quote.regularMarketPrice
  } catch { /* fall through */ }

  // Fallback: try ASX suffix for Australian-listed tickers (e.g. NDQ → NDQ.AX)
  if (!ticker.includes('.')) {
    try {
      const quote = await yf.quote(`${ticker}.AX`)
      if (quote.regularMarketPrice != null) return quote.regularMarketPrice
    } catch { /* fall through */ }
  }

  return null
}

export const getLivePrices = unstable_cache(
  async (tickers: string[]): Promise<Record<string, number | null>> => {
    const entries = await Promise.all(
      tickers.map(async (ticker) => [ticker, await fetchPrice(ticker)] as const)
    )
    return Object.fromEntries(entries)
  },
  ['investment-prices'],
  { revalidate: 3600 }
)
