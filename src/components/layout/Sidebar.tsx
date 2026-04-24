'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, PieChart, TrendingUp,
  Sparkles, LogOut, Plus, ScanLine, Wallet, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',             label: 'Overview',     icon: LayoutDashboard },
  { href: '/add',          label: 'Add',          icon: Plus },
  { href: '/capture',      label: 'Scan',         icon: ScanLine },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/budgets',      label: 'Budgets',      icon: Wallet },
  { href: '/spending',     label: 'Spending',     icon: PieChart },
  { href: '/investments',  label: 'Investments',  icon: TrendingUp },
  { href: '/insights',     label: 'AI Insights',  icon: Sparkles },
]


function NavItem({
  href, label, icon: Icon,
}: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[14px] font-medium transition-all duration-150 cursor-pointer select-none',
        active
          ? 'nav-active'
          : 'text-[rgba(235,235,245,0.55)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]',
      )}
    >
      <Icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'text-[#0a84ff]' : '')} />
      {label}
    </Link>
  )
}

export function Sidebar() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside
      className="hidden md:flex flex-col w-[255px] min-h-screen px-3 py-5 relative z-10 ios-glass border-r border-[rgba(84,84,88,0.3)]"
    >
      {/* App identity */}
      <div className="mb-6 px-2 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 select-none"
          style={{ background: 'linear-gradient(135deg, #0a84ff, #bf5af2)' }}
        >
          <span className="text-white font-bold text-[16px]">F</span>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-white leading-tight">Findash</p>
          <p className="text-[11px] leading-tight" style={{ color: 'rgba(235,235,245,0.35)' }}>
            Finance Dashboard
          </p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-[2px]">
        {NAV_ITEMS.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      <div className="h-px my-3" style={{ background: 'rgba(84,84,88,0.35)' }} />

      <div className="space-y-[2px]">
        <NavItem href="/settings" label="Settings" icon={Settings} />
        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[14px] font-medium transition-all duration-150 cursor-pointer w-full hover:bg-[rgba(255,255,255,0.06)]"
          style={{ color: 'rgba(235,235,245,0.4)' }}
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
