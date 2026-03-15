'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trash2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatDate, formatCurrency, groupByDate } from '@/lib/utils'
import { deleteTransaction } from '@/lib/api'
import type { Transaction, Profile, CardPaymentListItem } from '@/lib/types'
import TransactionCard from '@/components/TransactionCard'
import Avatar from '@/components/ui/Avatar'
import MonthPicker from '@/components/ui/MonthPicker'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Filter = 'all' | 'income' | 'expense' | 'personal' | 'common' | 'shared' | 'recurring'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'Tout' },
  { key: 'income',    label: 'Revenus' },
  { key: 'expense',   label: 'Dépenses' },
  { key: 'personal',  label: 'Personnel' },
  { key: 'common',    label: 'Commun' },
  { key: 'shared',    label: 'Partagé' },
  { key: 'recurring', label: '🔄 Récurrentes' },
]

export default function TransactionsPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))
  const [filter, setFilter] = useState<Filter>('all')
  const [whoFilter, setWhoFilter] = useState<'couple' | string>('couple')
  const [me, setMe] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Charger l'utilisateur courant + tous les autres ayant au moins une transaction
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: myProfile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      setMe(myProfile)

      // Tous les user_id distincts dans les transactions
      const { data: txUsers } = await supabase
        .from('transactions').select('user_id')

      const otherIds = [...new Set(
        (txUsers || []).map((t: { user_id: string }) => t.user_id).filter((id: string) => id !== user.id)
      )]

      if (otherIds.length === 0) {
        setProfiles(myProfile ? [myProfile] : [])
        return
      }

      const { data: partners } = await supabase
        .from('profiles').select('*').in('id', otherIds)

      setProfiles([...(myProfile ? [myProfile] : []), ...(partners || [])])
    })
  }, [])

  const params: Record<string, string> = { month }
  if (filter === 'income' || filter === 'expense') params.type = filter
  if (filter === 'personal' || filter === 'common' || filter === 'shared') params.scope = filter
  if (filter === 'recurring') params.is_recurring = 'true'
  if (whoFilter !== 'couple') params.user_id = whoFilter
  if (debouncedSearch) params.search = debouncedSearch

  const { data: transactions, loading, refetch } = useFetch<Transaction[]>(
    `/api/transactions?${new URLSearchParams(params)}`
  )
  const { data: cardPayments } = useFetch<CardPaymentListItem[]>(
    filter === 'income' || filter === 'personal' || filter === 'common' || filter === 'shared'
      ? null
      : `/api/credit-card-payments?month=${month}`
  )

  function handleDelete(id: string) {
    setPendingDelete(id)
  }

  const groups = groupByDate(transactions || [])

  // Ajouter les remboursements cartes aux mêmes groupes par date
  const filteredPayments = (cardPayments || []).filter(p =>
    whoFilter === 'couple' || p.user_id === whoFilter
  )
  for (const p of filteredPayments) {
    const d = p.payment_date.split('T')[0]
    if (!groups[d]) groups[d] = []
  }

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  const partner = profiles.find(p => p.id !== me?.id)

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#fafafa]">Transactions</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Recherche */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Rechercher une transaction..."
          className="w-full pl-9 pr-4 py-2.5 bg-[#27272a] rounded-xl text-sm text-[#fafafa] placeholder-[#71717a] border border-[#3f3f46] focus:outline-none focus:border-[#e879f9]"
        />
      </div>

      {/* Filtre QUI */}
      <div className="flex gap-2 mb-3">
        {/* Couple */}
        <button
          onClick={() => setWhoFilter('couple')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            whoFilter === 'couple' ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'
          }`}
          style={whoFilter === 'couple' ? btnStyle : {}}
        >
          💑 Couple
        </button>

        {/* Moi */}
        {me && (
          <button
            onClick={() => setWhoFilter(me.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              whoFilter === me.id ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'
            }`}
            style={whoFilter === me.id ? btnStyle : {}}
          >
            <Avatar
              displayName={me.display_name}
              color={me.avatar_color}
              avatarUrl={me.avatar_url}
              size="xs"
            />
            Moi
          </button>
        )}

        {/* Partenaire */}
        {partner && (
          <button
            onClick={() => setWhoFilter(partner.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              whoFilter === partner.id ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'
            }`}
            style={whoFilter === partner.id ? btnStyle : {}}
          >
            <Avatar
              displayName={partner.display_name}
              color={partner.avatar_color}
              avatarUrl={partner.avatar_url}
              size="xs"
            />
            {partner.display_name?.split(' ')[0] || 'Partenaire'}
          </button>
        )}
      </div>

      {/* Filtres type/scope */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'
            }`}
            style={filter === f.key ? btnStyle : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : sortedDates.length === 0 ? (
        <EmptyState
          icon="💳"
          title="Aucune transaction"
          description="Appuyez sur + pour en ajouter une"
        />
      ) : (
        <div className="space-y-4">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-medium text-[#a1a1aa] mb-2 uppercase tracking-wider">
                {formatDate(date + 'T00:00:00')}
              </p>
              <div className="space-y-2">
                {groups[date].map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    {t.user_id === me?.id ? (
                      <Link href={`/transactions/${t.id}/edit`} className="flex-1 min-w-0">
                        <TransactionCard transaction={t} />
                      </Link>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <TransactionCard transaction={t} />
                      </div>
                    )}
                    {t.user_id === me?.id && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="flex-shrink-0 p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444]"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {/* Remboursements cartes du jour */}
                {filteredPayments.filter(p => p.payment_date.split('T')[0] === date).map(p => (
                  <div key={`pay-${p.id}`} className="flex items-center gap-3 bg-[#18181b] rounded-2xl px-3 py-3 border border-[#3f3f46]">
                    <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/15 flex items-center justify-center text-lg flex-shrink-0">
                      💳
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#fafafa] truncate">
                        Remb. {p.credit_cards?.name}{p.credit_cards?.last_four ? ` ••${p.credit_cards.last_four}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.profiles && (
                          <Avatar
                            displayName={p.profiles.display_name}
                            color={p.profiles.avatar_color}
                            avatarUrl={p.profiles.avatar_url}
                            size="xs"
                          />
                        )}
                        {p.bank_accounts && (
                          <span className="text-[10px] text-[#71717a]">🏦 {p.bank_accounts.name}</span>
                        )}
                        {p.note && <span className="text-[10px] text-[#71717a] truncate">{p.note}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#8b5cf6] flex-shrink-0">
                      -{formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer la transaction"
        message="Cette transaction sera définitivement supprimée."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (pendingDelete) { await deleteTransaction(pendingDelete); setPendingDelete(null); refetch() }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
