'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatDate, groupByDate } from '@/lib/utils'
import { deleteTransaction } from '@/lib/api'
import type { Transaction, Profile } from '@/lib/types'
import TransactionCard from '@/components/TransactionCard'
import Avatar from '@/components/ui/Avatar'
import MonthPicker from '@/components/ui/MonthPicker'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Filter = 'all' | 'income' | 'expense' | 'personal' | 'common' | 'shared'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'Tout' },
  { key: 'income',   label: 'Revenus' },
  { key: 'expense',  label: 'Dépenses' },
  { key: 'personal', label: 'Personnel' },
  { key: 'common',   label: 'Commun' },
  { key: 'shared',   label: 'Partagé' },
]

export default function TransactionsPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))
  const [filter, setFilter] = useState<Filter>('all')
  const [whoFilter, setWhoFilter] = useState<'couple' | string>('couple')
  const [me, setMe] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // Charger l'utilisateur courant + partenaire (uniquement ceux ayant interagi avec nos transactions)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // Mon profil
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setMe(myProfile)

      // Partenaire = quelqu'un qui a modifié une de mes transactions OU dont j'ai modifié une transaction
      const [{ data: editedByOthers }, { data: iEdited }] = await Promise.all([
        supabase.from('transactions').select('updated_by').eq('user_id', user.id).neq('updated_by', user.id).not('updated_by', 'is', null),
        supabase.from('transactions').select('user_id').eq('updated_by', user.id).neq('user_id', user.id),
      ])

      const partnerIds = [...new Set([
        ...(editedByOthers || []).map((t: { updated_by: string }) => t.updated_by),
        ...(iEdited || []).map((t: { user_id: string }) => t.user_id),
      ])]

      if (partnerIds.length === 0) {
        setProfiles(myProfile ? [myProfile] : [])
        return
      }

      const { data: partners } = await supabase
        .from('profiles')
        .select('*')
        .in('id', partnerIds)

      setProfiles([...(myProfile ? [myProfile] : []), ...(partners || [])])
    })
  }, [])

  const params: Record<string, string> = { month }
  if (filter === 'income' || filter === 'expense') params.type = filter
  if (filter === 'personal' || filter === 'common' || filter === 'shared') params.scope = filter
  if (whoFilter !== 'couple') params.user_id = whoFilter

  const { data: transactions, loading, refetch } = useFetch<Transaction[]>(
    `/api/transactions?${new URLSearchParams(params)}`
  )

  function handleDelete(id: string) {
    setPendingDelete(id)
  }

  const groups = groupByDate(transactions || [])
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
                    <Link href={`/transactions/${t.id}/edit`} className="flex-1 min-w-0">
                      <TransactionCard transaction={t} />
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="flex-shrink-0 p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444]"
                    >
                      <Trash2 size={16} />
                    </button>
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
