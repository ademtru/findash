'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, PieChart, TrendingUp, Sparkles, CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns', icon: ArrowLeftRight },
  { href: '/spending', label: 'Spend', icon: PieChart },
  { href: '/investments', label: 'Invest', icon: TrendingUp },
  { href: '/insights', label: 'AI', icon: Sparkles },
  { href: '/upload', label: 'Upload', icon: CloudUpload },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
      style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors cursor-pointer',
                active ? 'text-cyan-400' : 'text-slate-500'
              )}>
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
