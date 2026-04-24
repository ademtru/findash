'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, ScanLine, Sparkles, Plus, Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',             label: 'Home',     icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns',     icon: ArrowLeftRight },
  { href: '/add',          label: 'Add',      icon: Plus },
  { href: '/capture',      label: 'Scan',     icon: ScanLine },
  { href: '/insights',     label: 'AI',       icon: Sparkles },
  { href: '/settings',     label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        borderTop: '0.5px solid rgba(84,84,88,0.5)',
        background: 'rgba(22,22,24,0.92)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-[49px]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] cursor-pointer select-none active:opacity-50 transition-opacity"
              style={{ color: active ? '#0a84ff' : 'rgba(235,235,245,0.45)' }}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
