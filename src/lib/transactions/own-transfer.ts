import { listAccounts } from '@/db/queries/accounts'
import type { AccountRow } from '@/db/schema'

// Extract all candidate last-4 values from a description:
// 1. Masked patterns: "...1234", "****1234"
// 2. Last 4 digits of any 6+ digit group (e.g. full account numbers like "662891877" → "1877")
export function extractLast4Candidates(description: string): string[] {
  const candidates = new Set<string>()

  const masked = description.match(/[\.\*]{2,}\s*(\d{4})/)
  if (masked?.[1]) candidates.add(masked[1])

  for (const match of description.matchAll(/\d{6,}/g)) {
    candidates.add(match[0].slice(-4))
  }

  return [...candidates]
}

export function checkOwnAccountTransfer(description: string, accounts: AccountRow[]): boolean {
  if (accounts.length === 0) return false
  const candidates = extractLast4Candidates(description)
  if (candidates.length === 0) return false
  return accounts.some((a) => candidates.includes(a.last4))
}

// Convenience wrapper that fetches accounts — use only when you need a one-off check.
// For batch extraction, prefer checkOwnAccountTransfer with a pre-fetched list.
export async function isOwnAccountTransfer(description: string): Promise<boolean> {
  const rows = await listAccounts()
  return checkOwnAccountTransfer(description, rows)
}
