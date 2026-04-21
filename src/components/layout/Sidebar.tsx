'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, PieChart, TrendingUp, Sparkles, LogOut, Zap, CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/spending', label: 'Spending', icon: PieChart },
  { href: '/investments', label: 'Investments', icon: TrendingUp },
  { href: '/insights', label: 'AI Insights', icon: Sparkles },
]

const UTILITY_ITEMS = [
  { href: '/upload', label: 'Upload Data', icon: CloudUpload },
]

export function Sidebar() {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-white/[0.06] px-4 py-6 relative z-10"
      style={{ background: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(20px)' }}>
      {/* Logo */}
      <div className="mb-8 px-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">Findash</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Finance OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                active
                  ? 'nav-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-cyan-400' : '')} />
              {label}
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] my-4" />

      {/* Utility links */}
      <div className="space-y-1 mb-2">
        {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                active
                  ? 'nav-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-cyan-400' : '')} />
              {label}
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
            </Link>
          )
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mb-4" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all duration-200 cursor-pointer w-full"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>
    </aside>
  )
}
