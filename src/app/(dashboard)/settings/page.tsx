import { listAccounts } from '@/db/queries/accounts'
import { AccountsSettings } from './AccountsSettings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const accounts = await listAccounts()

  return (
    <div className="px-4 py-5 md:px-6 md:py-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-white tracking-tight">Settings</h1>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-[17px] font-semibold text-white">My Accounts</h2>
          <p className="text-[13px] mt-0.5" style={{ color: 'rgba(235,235,245,0.5)' }}>
            Transfers to these account suffixes are pre-skipped during review.
          </p>
        </div>
        <AccountsSettings initial={accounts} />
      </section>
    </div>
  )
}
