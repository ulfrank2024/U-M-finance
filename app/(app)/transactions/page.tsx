'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatDate, groupByDate } from '@/lib/utils'
import { deleteTransaction } from '@/lib/api'
import type { Transaction } from '@/lib/types'
import TransactionCard from '@/components/TransactionCard'
import MonthPicker from '@/components/ui/MonthPicker'
import EmptyState from '@/components/ui/EmptyState'

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

  const params: Record<string, string> = { month }
  if (filter === 'income' || filter === 'expense') params.type = filter
  if (filter === 'personal' || filter === 'common' || filter === 'shared') params.scope = filter

  const { data: transactions, loading, refetch } = useFetch<Transaction[]>(
    `/api/transactions?${new URLSearchParams(params)}`
  )

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette transaction ?')) return
    await deleteTransaction(id)
    refetch()
  }

  const groups = groupByDate(transactions || [])
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#fafafa]">Transactions</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'text-white'
                : 'bg-[#27272a] text-[#a1a1aa]'
            }`}
            style={filter === f.key ? { background: 'linear-gradient(135deg, #e879f9, #818cf8)' } : {}}
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
                  <div key={t.id} className="relative group">
                    <Link href={`/transactions/${t.id}/edit`}>
                      <TransactionCard transaction={t} />
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
