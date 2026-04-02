'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowLeftRight, Wallet, BarChart2, Plus, Target, ShoppingCart, Tag, TrendingUp } from 'lucide-react'

const navItems = [
  { href: '/',             icon: Home,          label: 'Accueil' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/analytics',    icon: TrendingUp,     label: 'Analytique' },
  { href: '/shopping',     icon: ShoppingCart,   label: 'Courses' },
  { href: '/accounts',     icon: Wallet,         label: 'Comptes' },
  { href: '/projects',     icon: Target,         label: 'Projets' },
  { href: '/categories',   icon: Tag,            label: 'Catégories' },
  { href: '/report',       icon: BarChart2,      label: 'Rapport' },
]

export default function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col bg-[#18181b] border-r border-[#3f3f46] z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#3f3f46]">
        <p className="text-base font-bold text-[#fafafa]">U&M Finance 💑</p>
        <p className="text-[11px] text-[#71717a] mt-0.5">Gestion du couple</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-[#e879f9]/15 text-[#e879f9]'
                  : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bouton nouvelle transaction */}
      <div className="px-3 py-4 border-t border-[#3f3f46]">
        <Link
          href="/transactions/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Nouvelle transaction
        </Link>
      </div>
    </aside>
  )
}
