'use client'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowLeftRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatCurrency } from '@/lib/utils'
import { deleteTransfer } from '@/lib/api'
import type { Transfer, Profile } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'
import MonthPicker from '@/components/ui/MonthPicker'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'

export default function TransfersPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))
  const [me, setMe] = useState<Profile | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const { data: transfers, refetch } = useFetch<Transfer[]>(`/api/transfers?month=${month}`)
  const { data: profile } = useFetch<Profile>('/api/profile')

  useEffect(() => { if (profile) setMe(profile) }, [profile])

  const sent     = (transfers || []).filter(t => t.from_user === me?.id)
  const received = (transfers || []).filter(t => t.to_user   === me?.id)
  const totalSent     = sent.reduce((s, t) => s + Number(t.amount), 0)
  const totalReceived = received.reduce((s, t) => s + Number(t.amount), 0)

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    await deleteTransfer(pendingDelete)
    setPendingDelete(null)
    refetch()
  }, [pendingDelete, refetch])

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long' })
  }

  // Grouper par date
  const groups: Record<string, Transfer[]> = {}
  for (const t of (transfers || [])) {
    const d = t.transfer_date.split('T')[0]
    if (!groups[d]) groups[d] = []
    groups[d].push(t)
  }
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-full hover:bg-[#27272a] text-[#a1a1aa]">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-[#fafafa] flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-[#e879f9]" />
            Virements
          </h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Stats du mois */}
      {(transfers || []).length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
            <p className="text-[11px] text-[#a1a1aa] mb-1">↗️ Envoyé</p>
            <p className="text-base font-bold text-[#ef4444]">-{formatCurrency(totalSent)}</p>
            <p className="text-[10px] text-[#71717a] mt-0.5">{sent.length} virement{sent.length > 1 ? 's' : ''}</p>
          </div>
          <div className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
            <p className="text-[11px] text-[#a1a1aa] mb-1">↙️ Reçu</p>
            <p className="text-base font-bold text-[#22c55e]">+{formatCurrency(totalReceived)}</p>
            <p className="text-[10px] text-[#71717a] mt-0.5">{received.length} virement{received.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Liste groupée par date */}
      {sortedDates.length === 0 ? (
        <EmptyState
          icon="↔️"
          title="Aucun virement"
          description="Aucun virement ce mois-ci"
        />
      ) : (
        <div className="space-y-4">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider mb-2">
                {formatDate(date)}
              </p>
              <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                {groups[date].map((t, i, arr) => {
                  const isSender = t.from_user === me?.id
                  const other    = isSender ? t.to_profile : t.from_profile
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-[#27272a]' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar
                          displayName={other?.display_name || null}
                          color={other?.avatar_color || '#6366f1'}
                          avatarUrl={other?.avatar_url || null}
                          size="sm"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 text-[11px]">
                          {isSender ? '↗️' : '↙️'}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#fafafa] truncate">
                          {isSender
                            ? `Envoyé à ${other?.display_name || '…'}`
                            : `Reçu de ${other?.display_name || '…'}`}
                        </p>
                        {t.note && (
                          <p className="text-xs text-[#71717a] truncate mt-0.5">{t.note}</p>
                        )}
                      </div>

                      {/* Montant */}
                      <span className={`text-sm font-bold flex-shrink-0 ${isSender ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                        {isSender ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>

                      {/* Supprimer */}
                      {isSender && (
                        <button
                          onClick={() => setPendingDelete(t.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg text-[#52525b] hover:text-[#ef4444] active:text-[#ef4444] transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer le virement"
        message="Ce virement et ses transactions associées seront supprimés."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
