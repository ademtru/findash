import { listAccounts } from '@/db/queries/accounts'

// Matches common bank description patterns: "...1234", "****1234", "* 1234"
const LAST4_RE = /[\.\*]{2,}\s*(\d{4})/

export function extractLast4(description: string): string | null {
  return description.match(LAST4_RE)?.[1] ?? null
}

export async function isOwnAccountTransfer(description: string): Promise<boolean> {
  const last4 = extractLast4(description)
  if (!last4) return false
  const rows = await listAccounts()
  return rows.some((a) => a.last4 === last4)
}
