'use client'
import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { createSharedGroup, deleteSharedGroup } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { SharedGroup } from '@/lib/types'
import TransactionCard from '@/components/TransactionCard'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'

export default function SharedGroupsPage() {
  const { data: groups, loading, refetch } = useFetch<SharedGroup[]>('/api/shared-groups')
  const [showAdd, setShowAdd] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      await createSharedGroup({ name: form.name, description: form.description || undefined })
      setShowAdd(false)
      setForm({ name: '', description: '' })
      refetch()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setFormLoading(false)
    }
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa]">Groupes partagés</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Dépenses en commun</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl text-white" style={btnStyle}>
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : !groups?.length ? (
        <EmptyState
          icon="🤝"
          title="Aucun groupe"
          description="Créez un groupe pour partager une dépense (Amazon, courses...)"
        />
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const total = (group.transactions || []).reduce((s, t) => s + Number(t.amount), 0)
            const isOpen = expanded === group.id

            return (
              <div key={group.id} className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : group.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#fafafa] text-sm truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-[#a1a1aa] truncate">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#a1a1aa]">{group.transactions?.length || 0} transaction(s)</span>
                      {total > 0 && <span className="text-xs font-semibold text-[#e879f9]">{formatCurrency(total)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.created_by_profile && (
                      <Avatar
                        displayName={group.created_by_profile.display_name}
                        color={group.created_by_profile.avatar_color}
                        avatarUrl={group.created_by_profile.avatar_url}
                        size="xs"
                      />
                    )}
                    {isOpen ? <ChevronUp size={16} className="text-[#a1a1aa]" /> : <ChevronDown size={16} className="text-[#a1a1aa]" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[#3f3f46] p-3 space-y-2">
                    {group.transactions?.length ? (
                      group.transactions.map(t => <TransactionCard key={t.id} transaction={t} />)
                    ) : (
                      <p className="text-xs text-[#a1a1aa] text-center py-2">Aucune transaction liée à ce groupe</p>
                    )}
                    <button
                      onClick={async () => { if (confirm('Supprimer ce groupe ?')) { await deleteSharedGroup(group.id); refetch() } }}
                      className="w-full h-9 rounded-xl text-xs text-[#ef4444] bg-[#ef4444]/10 mt-2"
                    >
                      Supprimer le groupe
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nouveau groupe */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Nouveau groupe</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <input placeholder="Nom (ex: Amazon Mars, Courses Carrefour)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input placeholder="Description (optionnel)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              {formError && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{formError}</p>}
              <button type="submit" disabled={formLoading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
                {formLoading ? 'Création...' : 'Créer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
