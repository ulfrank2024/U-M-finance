'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, CreditCard, User, Plus } from 'lucide-react'

const tabs = [
  { href: '/',              icon: Home,           label: 'Accueil' },
  { href: '/transactions',  icon: ArrowLeftRight,  label: 'Transactions' },
  { href: '/transactions/new', icon: Plus,          label: '', fab: true },
  { href: '/credit-cards',  icon: CreditCard,      label: 'Cartes' },
  { href: '/profile',       icon: User,            label: 'Profil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-[#3f3f46]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href) && tab.href !== '/transactions/new'

          if (tab.fab) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg shadow-fuchsia-500/30"
                style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}
              >
                <Plus size={26} color="white" strokeWidth={2.5} />
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                isActive ? 'text-[#e879f9]' : 'text-[#a1a1aa]'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
