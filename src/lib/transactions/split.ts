const TOLERANCE = 0.005

export function validateSplits(
  originalAmount: number,
  splits: { amount: number }[],
): string | null {
  if (splits.length < 2) return 'Must have at least 2 splits'
  if (splits.some((s) => s.amount === 0)) return 'Each split must have a non-zero amount'
  const sum = splits.reduce((acc, s) => acc + s.amount, 0)
  if (Math.abs(sum - originalAmount) >= TOLERANCE) {
    return `Splits total $${Math.abs(sum).toFixed(2)} but original is $${Math.abs(originalAmount).toFixed(2)}`
  }
  return null
}
