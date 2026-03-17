'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Wallet, CreditCard } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatCurrency } from '@/lib/utils'
import type { BalanceResponse, Transaction, Project, BankAccount, CreditCard as CreditCardType, Profile } from '@/lib/types'
import BalanceCard from '@/components/BalanceCard'
import TransactionCard from '@/components/TransactionCard'
import ProjectCard from '@/components/ProjectCard'
import MonthPicker from '@/components/ui/MonthPicker'
import EmptyState from '@/components/ui/EmptyState'
import Avatar from '@/components/ui/Avatar'

export default function DashboardPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))

  const { data: balance, loading: bLoading } = useFetch<BalanceResponse>(`/api/balance?month=${month}`)
  const { data: transactions } = useFetch<Transaction[]>(`/api/transactions?month=${month}`)
  const { data: projects } = useFetch<Project[]>('/api/projects')
  const { data: bankAccounts } = useFetch<BankAccount[]>('/api/bank-accounts')
  const { data: creditCards } = useFetch<CreditCardType[]>('/api/credit-cards')
  const { data: profile } = useFetch<Profile>('/api/profile')
  const { data: allProfiles } = useFetch<Profile[]>('/api/profiles')

  const recent = (transactions || []).slice(0, 5)
  const activeProjects = (projects || []).filter(p => p.status === 'active').slice(0, 3)
  const totalCardDebt = (creditCards || []).reduce((s, c) => s + Math.max(0, c.current_balance), 0)

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa]">U&M Finance 💑</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Tableau de bord</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} />
          <Link href="/profile" className="rounded-full overflow-hidden flex-shrink-0">
            <Avatar
              displayName={profile?.display_name || null}
              email={profile?.email}
              color={profile?.avatar_color || '#6366f1'}
              avatarUrl={profile?.avatar_url || null}
              size="sm"
            />
          </Link>
        </div>
      </div>

      {/* Anniversaires */}
      {(() => {
        if (!allProfiles?.length) return null
        const myProfile = allProfiles.find(p => p.id === profile?.id)
        const partnerProfile = allProfiles.find(p => p.id !== profile?.id)
        if (!myProfile?.birthday && !partnerProfile?.birthday) return null

        function BirthdayCard({ p, align }: { p: typeof myProfile; align: 'left' | 'right' }) {
          if (!p) return <div />
          const today = new Date()
          const bday = p.birthday ? new Date(p.birthday + 'T00:00:00') : null
          let label = ''
          let highlight = false
          if (bday) {
            const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
            if (next < today) next.setFullYear(today.getFullYear() + 1)
            const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) { label = "🎂 Aujourd'hui !"; highlight = true }
            else if (diffDays === 1) { label = '🎉 Demain !'; highlight = true }
            else if (diffDays <= 7) { label = `🎁 Dans ${diffDays}j`; highlight = true }
            else label = `🎂 ${bday.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}`
          }
          return (
            <div className={`flex-1 flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5">
                <Avatar displayName={p.display_name} color={p.avatar_color} avatarUrl={p.avatar_url} size="xs" />
                <span className="text-xs font-medium text-[#fafafa] truncate max-w-[80px]">
                  {p.display_name?.split(' ')[0] || 'Moi'}
                </span>
              </div>
              {bday && (
                <span className={`text-[11px] mt-0.5 ${highlight ? 'text-[#e879f9] font-semibold' : 'text-[#71717a]'}`}>
                  {label}
                </span>
              )}
            </div>
          )
        }

        return (
          <div className="flex items-start justify-between px-1">
            <BirthdayCard p={myProfile} align="left" />
            <BirthdayCard p={partnerProfile} align="right" />
          </div>
        )
      })()}

      {/* Balance */}
      {bLoading ? (
        <div className="h-40 bg-[#18181b] rounded-2xl animate-pulse" />
      ) : balance ? (
        <BalanceCard data={balance} />
      ) : null}

      {/* Stats rapides */}
      {balance && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
            <p className="text-[11px] text-[#a1a1aa] mb-1">Revenus</p>
            <p className="text-base font-bold text-[#22c55e]">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(balance.couple_total.income)}
            </p>
          </div>
          <div className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
            <p className="text-[11px] text-[#a1a1aa] mb-1">Dépenses</p>
            <p className="text-base font-bold text-[#ef4444]">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(balance.couple_total.total_expenses)}
            </p>
          </div>
        </div>
      )}

      {/* Comptes bancaires */}
      {(bankAccounts || []).length > 0 && (() => {
        const sharedAccounts  = (bankAccounts || []).filter(a => a.is_shared)
        // Grouper par propriétaire (owner.id) pour afficher un bloc par personne
        const ownerMap = new Map<string, { name: string; items: BankAccount[] }>()
        ;(bankAccounts || []).filter(a => !a.is_shared).forEach(a => {
          const id = a.owner?.id ?? a.owner_id ?? 'unknown'
          const name = a.owner?.display_name ?? 'Inconnu'
          if (!ownerMap.has(id)) ownerMap.set(id, { name, items: [] })
          ownerMap.get(id)!.items.push(a)
        })
        const ownerEntries = [...ownerMap.entries()].sort(([id]) => id === profile?.id ? -1 : 1)

        const AccountGrid = ({ items }: { items: BankAccount[] }) => (
          <div className="grid grid-cols-2 gap-2">
            {items.map(acc => (
              <div key={acc.id} className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${acc.color}25` }}>
                    <Wallet size={14} style={{ color: acc.color }} />
                  </div>
                  <span className="text-xs font-medium text-[#fafafa] truncate">{acc.name}</span>
                </div>
                <p className={`text-sm font-bold ${acc.balance >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {formatCurrency(acc.balance)}
                </p>
                <p className="text-[10px] text-[#71717a] mt-0.5">solde</p>
              </div>
            ))}
          </div>
        )

        return (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#fafafa]">Comptes bancaires</h2>
              <Link href="/accounts" className="text-xs text-[#e879f9]">Gérer</Link>
            </div>
            <div className="space-y-3">
              {ownerEntries.map(([ownerId, group]) => (
                <div key={ownerId}>
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider mb-1.5">
                    {ownerId === profile?.id ? 'Mes comptes' : `Comptes de ${group.name.split(' ')[0]}`}
                  </p>
                  <AccountGrid items={group.items} />
                </div>
              ))}
              {sharedAccounts.length > 0 && (
                <div>
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider mb-1.5">💑 Communs</p>
                  <AccountGrid items={sharedAccounts} />
                </div>
              )}
            </div>
          </section>
        )
      })()}

      {/* Cartes de crédit - groupées par propriétaire */}
      {(creditCards || []).length > 0 && totalCardDebt > 0 && (() => {
        const sharedCards = (creditCards || []).filter(c => c.is_shared)
        const cardOwnerMap = new Map<string, { name: string; items: CreditCardType[] }>()
        ;(creditCards || []).filter(c => !c.is_shared).forEach(c => {
          const id = c.owner?.id ?? c.owner_id ?? 'unknown'
          const name = (c.owner as { display_name?: string | null } | null)?.display_name ?? 'Inconnu'
          if (!cardOwnerMap.has(id)) cardOwnerMap.set(id, { name, items: [] })
          cardOwnerMap.get(id)!.items.push(c)
        })
        const cardEntries = [...cardOwnerMap.entries()].sort(([id]) => id === profile?.id ? -1 : 1)

        return (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#fafafa]">Cartes de crédit</h2>
              <Link href="/credit-cards" className="text-xs text-[#e879f9]">Détails</Link>
            </div>
            <div className="space-y-3">
              {cardEntries.map(([ownerId, group]) => {
                const groupDebt = group.items.reduce((s, c) => s + Math.max(0, c.current_balance), 0)
                if (groupDebt === 0) return null
                return (
                  <div key={ownerId}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] text-[#71717a] uppercase tracking-wider">
                        {ownerId === profile?.id ? 'Mes cartes' : `Cartes de ${group.name.split(' ')[0]}`}
                      </p>
                      <span className="text-[11px] font-semibold text-[#ef4444]">{formatCurrency(groupDebt)}</span>
                    </div>
                    <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                      {group.items.filter(c => c.current_balance > 0).map((c, i, arr) => (
                        <div key={c.id} className={`flex items-center justify-between px-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                          <span className="text-[11px] text-[#d4d4d8] truncate">{c.name}{c.last_four ? ` ••${c.last_four}` : ''}</span>
                          <span className="text-[11px] font-semibold text-[#ef4444] flex-shrink-0 ml-2">{formatCurrency(c.current_balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {sharedCards.filter(c => c.current_balance > 0).length > 0 && (
                <div>
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider mb-1">Cartes communes</p>
                  <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                    {sharedCards.filter(c => c.current_balance > 0).map((c, i, arr) => (
                      <div key={c.id} className={`flex items-center justify-between px-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                        <span className="text-[11px] text-[#d4d4d8] truncate">{c.name}{c.last_four ? ` ••${c.last_four}` : ''}</span>
                        <span className="text-[11px] font-semibold text-[#ef4444] flex-shrink-0 ml-2">{formatCurrency(c.current_balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-3 py-2.5 mt-2 flex justify-between items-center bg-[#ef4444]/5 rounded-2xl border border-[#ef4444]/20">
              <span className="text-xs text-[#a1a1aa]">Total dû (couple)</span>
              <span className="text-sm font-bold text-[#ef4444]">{formatCurrency(totalCardDebt)}</span>
            </div>
          </section>
        )
      })()}

      {/* Projets */}
      {activeProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#fafafa]">Projets en cours</h2>
            <Link href="/projects" className="text-xs text-[#e879f9]">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {/* Lien rapport */}
      <Link href="/report" className="flex items-center justify-between p-4 bg-[#18181b] rounded-2xl border border-[#3f3f46]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#818cf8]/15 flex items-center justify-center text-xl">📊</div>
          <div>
            <p className="text-sm font-medium text-[#fafafa]">Rapport mensuel</p>
            <p className="text-xs text-[#a1a1aa]">Charges fixes, variables, tendances</p>
          </div>
        </div>
        <span className="text-[#a1a1aa] text-lg">›</span>
      </Link>

      {/* Dernières transactions */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#fafafa]">Dernières transactions</h2>
          <Link href="/transactions" className="text-xs text-[#e879f9]">Voir tout</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon="💳" title="Aucune transaction" description="Ajoutez votre première dépense ou revenu" />
        ) : (
          <div className="space-y-2">
            {recent.map(t => <TransactionCard key={t.id} transaction={t} />)}
          </div>
        )}
      </section>
    </div>
  )
}
