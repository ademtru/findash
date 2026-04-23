import { QuickAddForm } from './QuickAddForm'
import { distinctCategories } from '@/db/queries/transactions'

export const dynamic = 'force-dynamic'

export default async function AddPage() {
  const userCategories = await distinctCategories()

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Add Transaction</h1>
        <p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
          Log something as it happens.
        </p>
      </div>
      <QuickAddForm userCategories={userCategories} />
    </div>
  )
}
