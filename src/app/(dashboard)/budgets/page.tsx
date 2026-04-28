import { listTransactions, distinctCategories } from '@/db/queries/transactions'
import { listBudgetsForMonth, hasMonthBudgets } from '@/db/queries/budgets'
import {
  currentMonthKey,
  getMonthSpendByCategory,
  monthProgress,
  nextMonth,
  paceStatus,
  prevMonth,
  resolveCapCents,
} from '@/lib/budgets'
import { mergeCategoriesForType } from '@/lib/categories'
import { BudgetList, type BudgetCategoryView, type CategoryTransaction } from './BudgetList'

export const dynamic = 'force-dynamic'

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: rawMonth } = await searchParams
  const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentMonthKey()

  const [txns, budgetRows, userCategories, prevMonthHasBudgets] = await Promise.all([
    listTransactions({ month }),
    listBudgetsForMonth(month),
    distinctCategories(),
    hasMonthBudgets(prevMonth(month)),
  ])

  const spendMap = getMonthSpendByCategory(txns, month)
  const progress = monthProgress(month)

  const categoryUniverse = new Set<string>([
    ...mergeCategoriesForType('expense', userCategories),
    ...budgetRows.map((b) => b.category),
    ...spendMap.keys(),
  ])


  // Map groupId → the expense transaction's category (for routing non-expense group members)
  const groupExpenseCategoryMap = new Map<string, string>()
  for (const t of txns) {
    if (t.type === 'expense' && t.groupId) {
      groupExpenseCategoryMap.set(t.groupId, t.category)
    }
  }

  // Build drill-down: expenses as primary rows, non-expense group members as sub-rows directly after their primary
  const txnsByCategory = new Map<string, CategoryTransaction[]>()

  // First pass: add all expense transactions as primary rows
  for (const t of txns) {
    if (t.type !== 'expense') continue
    const list = txnsByCategory.get(t.category) ?? []
    list.push({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      groupId: t.groupId ?? null,
      isSubRow: false,
    })
    txnsByCategory.set(t.category, list)
  }

  // Sort each category's expense rows by date descending
  for (const list of txnsByCategory.values()) {
    list.sort((a, b) => b.date.localeCompare(a.date))
  }

  // Second pass: insert non-expense group members as sub-rows immediately after their primary expense
  for (const t of txns) {
    if (t.type === 'expense') continue
    if (!t.groupId || !groupExpenseCategoryMap.has(t.groupId)) continue
    const targetCategory = groupExpenseCategoryMap.get(t.groupId)!
    const list = txnsByCategory.get(targetCategory)
    if (!list) continue
    // Find the index of the primary expense for this group
    const primaryIdx = list.findIndex((row) => row.groupId === t.groupId && !row.isSubRow)
    const subRow: CategoryTransaction = {
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      groupId: t.groupId,
      isSubRow: true,
    }
    if (primaryIdx !== -1) {
      // Insert sub-row right after the primary (and any already-inserted sub-rows for this group)
      let insertAt = primaryIdx + 1
      while (insertAt < list.length && list[insertAt].isSubRow && list[insertAt].groupId === t.groupId) {
        insertAt++
      }
      list.splice(insertAt, 0, subRow)
    } else {
      list.push(subRow)
    }
  }

  const categories: BudgetCategoryView[] = Array.from(categoryUniverse)
    .map<BudgetCategoryView>((category) => {
      const cap = resolveCapCents(budgetRows, category, month)
      const spent = spendMap.get(category) ?? 0
      const monthRecord = budgetRows.find((b) => b.category === category && b.month === month)
      const defaultRecord = budgetRows.find((b) => b.category === category && b.month === null)
      const pace = cap === null ? null : paceStatus({ spent, capCents: cap, fraction: progress.fraction })
      return {
        category,
        capCents: cap,
        spent,
        monthBudgetId: monthRecord?.id ?? null,
        defaultBudgetId: defaultRecord?.id ?? null,
        pace,
        transactions: txnsByCategory.get(category) ?? [],
      }
    })
    .sort((a, b) => {
      // Over-cap first, then has cap and on/under pace, then uncapped
      const weight = (c: BudgetCategoryView) => {
        if (c.pace?.status === 'over') return 0
        if (c.capCents !== null) return 1
        return 2
      }
      const w = weight(a) - weight(b)
      if (w !== 0) return w
      return a.category.localeCompare(b.category)
    })

  const totalCapCents = categories.reduce(
    (sum, c) => sum + (c.capCents ?? 0),
    0,
  )
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0)

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">Budgets</h1>
          <p className="text-[14px] mt-1" style={{ color: 'rgba(235,235,245,0.55)' }}>
            Monthly category caps with live spend tracking.
          </p>
        </div>
      </div>

      <MonthNav month={month} />

      <SummaryStrip
        totalCapCents={totalCapCents}
        totalSpent={totalSpent}
        progress={progress}
      />

      <BudgetList
        month={month}
        categories={categories}
        canCopyFromPrev={prevMonthHasBudgets}
        userHistoryCategories={userCategories}
      />
    </div>
  )
}

function MonthNav({ month }: { month: string }) {
  const prev = prevMonth(month)
  const next = nextMonth(month)
  return (
    <div className="flex items-center gap-2">
      <a
        href={`/budgets?month=${prev}`}
        className="px-3 py-1.5 rounded-lg text-[13px] font-medium"
        style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.8)' }}
      >
        ← {prev}
      </a>
      <span
        className="px-3 py-1.5 rounded-lg text-[14px] font-semibold"
        style={{ background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }}
      >
        {month}
      </span>
      <a
        href={`/budgets?month=${next}`}
        className="px-3 py-1.5 rounded-lg text-[13px] font-medium"
        style={{ background: 'rgba(120,120,128,0.16)', color: 'rgba(235,235,245,0.8)' }}
      >
        {next} →
      </a>
    </div>
  )
}

function SummaryStrip({
  totalCapCents,
  totalSpent,
  progress,
}: {
  totalCapCents: number
  totalSpent: number
  progress: ReturnType<typeof monthProgress>
}) {
  const capDollars = totalCapCents / 100
  const percent =
    capDollars <= 0 ? 0 : Math.min(2, totalSpent / capDollars)
  const over = percent > 1
  const barColor = over ? '#ff453a' : percent > progress.fraction + 0.2 ? '#ff9f0a' : '#30d158'
  return (
    <div className="ios-card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(235,235,245,0.45)' }}
          >
            Month total
          </p>
          <p className="text-[22px] font-semibold text-white mt-0.5">
            ${totalSpent.toFixed(0)}
            <span className="text-[14px] font-normal ml-1" style={{ color: 'rgba(235,235,245,0.5)' }}>
              / ${capDollars.toFixed(0)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(235,235,245,0.45)' }}
          >
            {progress.daysRemaining > 0 ? 'Days left' : 'Month ended'}
          </p>
          <p className="text-[22px] font-semibold text-white mt-0.5">
            {progress.daysRemaining}
          </p>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,128,0.2)' }}>
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(100, percent * 100)}%`, background: barColor }}
        />
      </div>
    </div>
  )
}
