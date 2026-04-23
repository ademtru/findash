// Period math for scheduled insights.
// All outputs are string keys / ISO dates. Treats dates as calendar dates (not timestamps) so
// daylight-saving transitions and runner timezone don't shift windows.

const DAY_MS = 86_400_000

function ymd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return ymd(dt)
}

export function monthRange(periodKey: string): { start: string; end: string } {
  const [y, m] = periodKey.split('-').map(Number)
  const end = new Date(Date.UTC(y, m, 0)) // day 0 of next month = last day of this month
  return {
    start: `${periodKey}-01`,
    end: ymd(end),
  }
}

export function previousMonthKey(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ISO week — Monday-start weeks, per ISO 8601
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7 // Sunday → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

function weekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`
}

// Given a moment that is early Monday in Sydney (i.e. cron fired), return the ISO week key
// of the week that just ended on Sunday.
export function previousIsoWeekKey(now: Date = new Date()): string {
  // Step back 3 days to land inside the prior week even on Monday-morning fires
  const prior = new Date(now.getTime() - 3 * DAY_MS)
  const { year, week } = isoWeek(prior)
  return weekKey(year, week)
}

// Given an ISO week key, return Monday→Sunday range.
export function isoWeekRange(key: string): { start: string; end: string } {
  const [yearStr, weekStr] = key.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  // Start: Monday of week 1 of year is the Monday on or before Jan 4 (ISO definition)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const mondayOfWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * DAY_MS)
  const monday = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * DAY_MS)
  const sunday = new Date(monday.getTime() + 6 * DAY_MS)
  return { start: ymd(monday), end: ymd(sunday) }
}

// Four weeks ending the day before the target week starts.
export function referenceWeekRange(key: string): { start: string; end: string } {
  const { start } = isoWeekRange(key)
  const refEnd = addDays(start, -1)
  const refStart = addDays(refEnd, -27) // 28 days = 4 weeks, inclusive
  return { start: refStart, end: refEnd }
}

// Six full months before the target month.
export function referenceMonthRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split('-').map(Number)
  const refEnd = new Date(Date.UTC(y, m - 1, 0)) // last day of month before target
  const refStart = new Date(Date.UTC(y, m - 1 - 6, 1))
  return { start: ymd(refStart), end: ymd(refEnd) }
}

export function inRange(date: string, range: { start: string; end: string }): boolean {
  return date >= range.start && date <= range.end
}
