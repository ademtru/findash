const SLUG_MAX = 40
const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function merchantSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
  return slug || 'unknown'
}

function toCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100)
}

function randomSuffix(): string {
  let out = ''
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  for (let i = 0; i < 4; i++) out += SUFFIX_ALPHABET[buf[i] % SUFFIX_ALPHABET.length]
  return out
}

export interface IdSeed {
  date: string
  amount: number
  description: string
}

export function generateTransactionId({ date, amount, description }: IdSeed): string {
  return `${date}-${toCents(amount)}-${merchantSlug(description)}-${randomSuffix()}`
}
