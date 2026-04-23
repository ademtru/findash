import { unstable_noStore as noStore } from 'next/cache'
import type { TransactionData } from '@/types/transaction'
import { listTransactions } from '@/db/queries/transactions'

export async function getTransactions(): Promise<TransactionData> {
  noStore()
  const transactions = await listTransactions()
  return { transactions }
}
