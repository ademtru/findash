import Link from 'next/link'
import { Settings } from 'lucide-react'

export function MobileSettingsLink() {
  return (
    <Link
      href="/settings"
      className="md:hidden flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-[rgba(255,255,255,0.08)]"
      style={{ color: 'rgba(235,235,245,0.55)' }}
    >
      <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </Link>
  )
}
