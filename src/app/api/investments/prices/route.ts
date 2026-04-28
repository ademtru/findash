import { NextResponse } from 'next/server'
import { getLivePrices } from '@/lib/prices'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('tickers') ?? ''
  const tickers = raw.split(',').map(t => t.trim()).filter(Boolean)

  if (tickers.length === 0) return NextResponse.json({})

  const prices = await getLivePrices(tickers)
  return NextResponse.json(prices)
}
