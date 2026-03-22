'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wallet, ChevronDown, ChevronRight, ArrowLeftRight, X } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { createClient } from '@/lib/supabase/client'
import { formatMonth, formatCurrency } from '@/lib/utils'
import type { BalanceResponse, Transaction, Project, BankAccount, CreditCard as CreditCardType, Profile } from '@/lib/types'
import { createTransfer, fetchTransfers, deleteTransfer } from '@/lib/api'
import type { Transfer } from '@/lib/types'
import BalanceCard from '@/components/BalanceCard'
import ProjectCard from '@/components/ProjectCard'
import MonthPicker from '@/components/ui/MonthPicker'
import EmptyState from '@/components/ui/EmptyState'
import Avatar from '@/components/ui/Avatar'

export default function DashboardPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [cardsOpen, setCardsOpen] = useState(false)
  const [transactionsOpen, setTransactionsOpen] = useState(true)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [transferTo, setTransferTo] = useState<string>('')
  const [fromAccountId, setFromAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState(false)
  const [transfers, setTransfers] = useState<Transfer[]>([])

  const { data: balance, loading: bLoading, refetch: refetchBalance } = useFetch<BalanceResponse>(`/api/balance?month=${month}`)
  const { data: transactions, refetch: refetchTxs } = useFetch<Transaction[]>(`/api/transactions?month=${month}`)
  const { data: projects } = useFetch<Project[]>('/api/projects')
  const { data: bankAccounts, refetch: refetchAccounts } = useFetch<BankAccount[]>('/api/bank-accounts')
  const { data: creditCards, refetch: refetchCards } = useFetch<CreditCardType[]>('/api/credit-cards')
  const { data: profile } = useFetch<Profile>('/api/profile')
  const { data: allProfiles } = useFetch<Profile[]>('/api/profiles')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_payments' }, () => {
        refetchCards()
        refetchAccounts()
        refetchBalance()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        refetchTxs()
        refetchAccounts()
        refetchBalance()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetchCards, refetchAccounts, refetchBalance, refetchTxs])

  const partner = (allProfiles || []).find(p => p.id !== profile?.id)

  useEffect(() => {
    if (partner && !transferTo) setTransferTo(partner.id)
  }, [partner, transferTo])

  useEffect(() => {
    fetchTransfers(month).then(setTransfers).catch(() => {})
  }, [month])

  async function handleTransfer() {
    const amt = parseFloat(transferAmount)
    if (!transferTo || isNaN(amt) || amt <= 0) return
    setTransferSaving(true)
    try {
      const newTransfer = await createTransfer({
        to_user: transferTo,
        amount: amt,
        note: transferNote || undefined,
        from_account_id: fromAccountId || undefined,
        to_account_id: toAccountId || undefined,
      })
      setTransfers(prev => [newTransfer, ...prev])
      setShowTransfer(false)
      setTransferAmount('')
      setTransferNote('')
      setTransferSuccess(true)
      setTimeout(() => setTransferSuccess(false), 3000)
      refetchBalance()
      refetchAccounts()
      refetchTxs()
    } finally {
      setTransferSaving(false)
    }
  }

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

      {/* Toast succès virement */}
      {transferSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-[#22c55e] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg">
          ✅ Virement enregistré
        </div>
      )}

      {/* Virement */}
      {allProfiles && allProfiles.length >= 2 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowTransfer(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#e879f9]/10 border border-[#e879f9]/30 text-[#e879f9] text-sm font-medium active:bg-[#e879f9]/20"
          >
            <ArrowLeftRight size={16} />
            Faire un virement
          </button>

          {transfers.length > 0 && (
            <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
              {transfers.slice(0, 5).map((t, i, arr) => {
                const isSender = t.from_user === profile?.id
                const other = isSender ? t.to_profile : t.from_profile
                return (
                  <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                    <div className="w-8 h-8 rounded-xl bg-[#e879f9]/15 flex items-center justify-center text-base flex-shrink-0">
                      {isSender ? '↗️' : '↙️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#fafafa] truncate">
                        {isSender ? `Envoyé à ${other?.display_name || '…'}` : `Reçu de ${other?.display_name || '…'}`}
                      </p>
                      <p className="text-[10px] text-[#71717a]">
                        {t.note || 'Virement'} · {new Date(t.transfer_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${isSender ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                      {isSender ? '-' : '+'}{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(t.amount)}
                    </span>
                    <button
                      onClick={async () => {
                        await deleteTransfer(t.id)
                        setTransfers(prev => prev.filter(x => x.id !== t.id))
                      }}
                      className="ml-1 text-[#52525b] hover:text-[#ef4444] active:text-[#ef4444] flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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
            <button
              onClick={() => setAccountsOpen(o => !o)}
              className="flex items-center justify-between w-full mb-2"
            >
              <div className="flex items-center gap-1.5">
                {accountsOpen ? <ChevronDown size={14} className="text-[#a1a1aa]" /> : <ChevronRight size={14} className="text-[#a1a1aa]" />}
                <h2 className="text-sm font-semibold text-[#fafafa]">Comptes bancaires</h2>
              </div>
              <Link href="/accounts" onClick={e => e.stopPropagation()} className="text-xs text-[#e879f9]">Gérer</Link>
            </button>
            {accountsOpen && (
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
            )}
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
            <button
              onClick={() => setCardsOpen(o => !o)}
              className="flex items-center justify-between w-full mb-2"
            >
              <div className="flex items-center gap-1.5">
                {cardsOpen ? <ChevronDown size={14} className="text-[#a1a1aa]" /> : <ChevronRight size={14} className="text-[#a1a1aa]" />}
                <h2 className="text-sm font-semibold text-[#fafafa]">Cartes de crédit</h2>
              </div>
              <Link href="/credit-cards" onClick={e => e.stopPropagation()} className="text-xs text-[#e879f9]">Détails</Link>
            </button>
            {cardsOpen && (
              <>
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
              </>
            )}
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

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/report" className="flex items-center justify-between p-4 bg-[#18181b] rounded-2xl border border-[#3f3f46]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#818cf8]/15 flex items-center justify-center text-lg">📊</div>
            <p className="text-sm font-medium text-[#fafafa]">Rapport</p>
          </div>
          <span className="text-[#a1a1aa]">›</span>
        </Link>
        <Link href="/categories" className="flex items-center justify-between p-4 bg-[#18181b] rounded-2xl border border-[#3f3f46]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e879f9]/15 flex items-center justify-center text-lg">🏷️</div>
            <p className="text-sm font-medium text-[#fafafa]">Catégories</p>
          </div>
          <span className="text-[#a1a1aa]">›</span>
        </Link>
      </div>

      {/* Dernières transactions */}
      <section>
        <button
          onClick={() => setTransactionsOpen(o => !o)}
          className="flex items-center justify-between w-full mb-2"
        >
          <div className="flex items-center gap-1.5">
            {transactionsOpen ? <ChevronDown size={14} className="text-[#a1a1aa]" /> : <ChevronRight size={14} className="text-[#a1a1aa]" />}
            <h2 className="text-sm font-semibold text-[#fafafa]">Dernières transactions</h2>
          </div>
          <Link href="/transactions" onClick={e => e.stopPropagation()} className="text-xs text-[#e879f9]">Voir tout</Link>
        </button>
        {transactionsOpen && (
          recent.length === 0 ? (
            <EmptyState icon="💳" title="Aucune transaction" description="Ajoutez votre première dépense ou revenu" />
          ) : (
            <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
              {recent.map((t, i) => {
                const isIncome = t.type === 'income'
                return (
                  <Link
                    key={t.id}
                    href={`/transactions/${t.id}`}
                    className={`flex items-center gap-3 px-4 py-3 active:bg-[#27272a] ${i < recent.length - 1 ? 'border-b border-[#27272a]' : ''}`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: t.categories?.color ? `${t.categories.color}25` : '#27272a' }}
                    >
                      {t.categories?.icon || '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#fafafa] truncate">
                        {t.description || t.categories?.name || (isIncome ? 'Revenu' : 'Dépense')}
                      </p>
                      <p className="text-[11px] text-[#a1a1aa] truncate">
                        {t.categories?.name}{t.bank_accounts ? ` · 🏦 ${t.bank_accounts.name}` : t.credit_cards ? ` · 💳 ${t.credit_cards.name}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${isIncome ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        )}
      </section>
      {/* Modal Virement */}
      {showTransfer && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={() => setShowTransfer(false)}>
          <div className="w-full max-w-lg bg-[#18181b] rounded-t-3xl p-5 pb-24 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#fafafa]">💸 Virement</h2>
              <button onClick={() => setShowTransfer(false)} className="text-[#71717a]"><X size={20} /></button>
            </div>

            {/* De → vers */}
            <div className="flex items-center gap-3">
              {[profile, partner].map((p, i) => p && (
                <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                  <Avatar displayName={p.display_name} color={p.avatar_color} avatarUrl={p.avatar_url} size="sm" />
                  <span className="text-[11px] text-[#a1a1aa]">{i === 0 ? 'De' : 'À'}</span>
                  <span className="text-xs font-medium text-[#fafafa] truncate max-w-[80px] text-center">
                    {p.display_name?.split(' ')[0] || 'Moi'}
                  </span>
                </div>
              ))}
            </div>

            {/* Compte source */}
            {(() => {
              const myAccounts = (bankAccounts || []).filter(a => a.owner_id === profile?.id || a.is_shared)
              if (!myAccounts.length) return null
              return (
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1 block">Débiter mon compte (optionnel)</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setFromAccountId('')}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs border ${!fromAccountId ? 'border-[#e879f9] bg-[#e879f9]/10 text-[#e879f9]' : 'border-[#3f3f46] text-[#71717a]'}`}
                    >
                      Aucun
                    </button>
                    {myAccounts.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setFromAccountId(a.id)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs border ${fromAccountId === a.id ? 'text-white' : 'border-[#3f3f46] text-[#71717a]'}`}
                        style={fromAccountId === a.id ? { backgroundColor: a.color, borderColor: a.color } : {}}
                      >
                        🏦 {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Compte destination */}
            {(() => {
              const partnerAccounts = (bankAccounts || []).filter(a => a.owner_id === partner?.id || a.is_shared)
              if (!partnerAccounts.length) return null
              return (
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1 block">Créditer son compte (optionnel)</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setToAccountId('')}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs border ${!toAccountId ? 'border-[#e879f9] bg-[#e879f9]/10 text-[#e879f9]' : 'border-[#3f3f46] text-[#71717a]'}`}
                    >
                      Aucun
                    </button>
                    {partnerAccounts.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setToAccountId(a.id)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs border ${toAccountId === a.id ? 'text-white' : 'border-[#3f3f46] text-[#71717a]'}`}
                        style={toAccountId === a.id ? { backgroundColor: a.color, borderColor: a.color } : {}}
                      >
                        🏦 {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Montant */}
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Montant</label>
              <div className="flex items-center bg-[#27272a] rounded-xl px-3 py-2.5">
                <span className="text-[#a1a1aa] text-sm mr-1">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="flex-1 bg-transparent text-[#fafafa] text-sm outline-none placeholder-[#52525b]"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Note (optionnel)</label>
              <input
                type="text"
                placeholder="Ex : cadeau, remboursement loyer…"
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                className="w-full bg-[#27272a] rounded-xl px-3 py-2.5 text-sm text-[#fafafa] outline-none placeholder-[#52525b]"
              />
            </div>

            <button
              onClick={handleTransfer}
              disabled={transferSaving || !transferAmount || parseFloat(transferAmount) <= 0}
              className="w-full py-3 rounded-xl bg-[#e879f9] text-white font-semibold text-sm disabled:opacity-50"
            >
              {transferSaving ? 'Enregistrement…' : 'Confirmer le virement'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
