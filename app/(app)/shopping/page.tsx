'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ShoppingCart, CalendarDays } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import {
  createShoppingList,
  deleteShoppingList,
  fetchShoppingLists,
} from '@/lib/api'
import type { ShoppingList, Category } from '@/lib/types'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'

const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

function statusBadge(status: ShoppingList['status']) {
  if (status === 'open') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Ouverte</span>
  if (status === 'shopping') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">En course</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3f3f46] text-[#71717a]">Terminée</span>
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 bg-[#3f3f46] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #e879f9, #818cf8)' }}
      />
    </div>
  )
}

export default function ShoppingPage() {
  const router = useRouter()
  const { data: lists, loading, refetch } = useFetch<ShoppingList[]>('/api/shopping-lists')
  const { data: categories } = useFetch<Category[]>('/api/categories')

  const [showAdd, setShowAdd] = useState(false)
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', planned_date: '', category_id: '' })
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const selectedCat = (categories || []).find(c => c.id === form.category_id)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      await createShoppingList({
        name: form.name,
        category_id: form.category_id || null,
        planned_date: form.planned_date || null,
      })
      setShowAdd(false)
      setForm({ name: '', planned_date: '', category_id: '' })
      refetch()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    await deleteShoppingList(pendingDelete)
    setPendingDelete(null)
    refetch()
  }

  const active = (lists || []).filter(l => l.status !== 'done')
  const done = (lists || []).filter(l => l.status === 'done')

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShoppingCart size={22} className="text-[#e879f9]" />
          <h1 className="text-xl font-bold text-[#fafafa]">Mes courses</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="p-2 rounded-xl text-white shadow-lg shadow-fuchsia-500/20"
          style={btnStyle}
        >
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#18181b] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !lists?.length ? (
        <EmptyState
          icon="🛒"
          title="Aucune liste de courses"
          description="Créez votre première liste pour commencer vos courses"
          action={
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={btnStyle}
            >
              Nouvelle liste
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {active.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">En cours</p>
              <div className="space-y-3">
                {active.map(list => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onPress={() => router.push(`/shopping/${list.id}`)}
                    onDelete={() => setPendingDelete(list.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Terminées</p>
              <div className="space-y-3">
                {done.map(list => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onPress={() => router.push(`/shopping/${list.id}`)}
                    onDelete={() => setPendingDelete(list.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer la liste"
        message="Cette action est irréversible. La liste et tous ses articles seront supprimés."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Add Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/60"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Nouvelle liste de courses</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                placeholder="Nom de la liste (ex: Courses semaine)"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
              />
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Date prévue (optionnel)</label>
                <div className="flex items-center gap-2 h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl">
                  <CalendarDays size={16} className="text-[#71717a] flex-shrink-0" />
                  <input
                    type="date"
                    value={form.planned_date}
                    onChange={e => setForm({ ...form, planned_date: e.target.value })}
                    className="flex-1 bg-transparent text-[#fafafa] text-sm focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCatPicker(true)}
                className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-sm text-left flex items-center gap-2"
              >
                {selectedCat ? (
                  <>
                    <span className="text-base">{selectedCat.icon}</span>
                    <span className="text-[#fafafa] flex-1">{selectedCat.name}</span>
                    <span
                      className="text-[#71717a] text-xs"
                      onClick={e => { e.stopPropagation(); setForm({ ...form, category_id: '' }) }}
                    >✕</span>
                  </>
                ) : (
                  <span className="text-[#71717a]">Catégorie (optionnel)</span>
                )}
              </button>
              {formError && (
                <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{formError}</p>
              )}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
                style={btnStyle}
              >
                {formLoading ? 'Création...' : 'Créer la liste'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Category Picker Modal */}
      {showCatPicker && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/60"
          onClick={() => setShowCatPicker(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] pb-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
              <h3 className="text-base font-bold text-[#fafafa]">Choisir une catégorie</h3>
              <button onClick={() => setShowCatPicker(false)} className="text-[#71717a] text-lg leading-none">✕</button>
            </div>
            {/* Aucune catégorie */}
            <button
              className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] active:bg-[#27272a]"
              onClick={() => { setForm({ ...form, category_id: '' }); setShowCatPicker(false) }}
            >
              <span className="w-9 h-9 rounded-xl bg-[#27272a] flex items-center justify-center text-lg">—</span>
              <span className={`text-sm ${!form.category_id ? 'text-[#e879f9] font-semibold' : 'text-[#a1a1aa]'}`}>Aucune catégorie</span>
              {!form.category_id && <span className="ml-auto text-[#e879f9]">✓</span>}
            </button>
            <div className="overflow-y-auto max-h-72">
              {(categories || []).map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] last:border-0 active:bg-[#27272a]"
                  onClick={() => { setForm({ ...form, category_id: c.id }); setShowCatPicker(false) }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${c.color}25` }}
                  >{c.icon}</span>
                  <span className={`text-sm flex-1 text-left ${form.category_id === c.id ? 'text-[#e879f9] font-semibold' : 'text-[#fafafa]'}`}>{c.name}</span>
                  {form.category_id === c.id && <span className="text-[#e879f9]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListCard({
  list,
  onPress,
  onDelete,
}: {
  list: ShoppingList
  onPress: () => void
  onDelete: () => void
}) {
  const itemsCount = list.items_count ?? 0
  const checkedCount = list.checked_count ?? 0

  return (
    <div
      className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 active:opacity-80 transition-opacity"
      onClick={onPress}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {list.categories && (
              <span className="text-base">{list.categories.icon}</span>
            )}
            <span className="text-[#fafafa] font-semibold text-sm truncate">{list.name}</span>
            {statusBadge(list.status)}
          </div>
          {list.planned_date && (
            <p className="text-xs text-[#71717a] mt-0.5 flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(list.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <button
          className="p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444] flex-shrink-0"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <ProgressBar value={checkedCount} max={itemsCount} />
      <p className="text-xs text-[#71717a] mt-1.5">
        {itemsCount === 0
          ? 'Aucun article'
          : `${checkedCount} / ${itemsCount} article${itemsCount > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}
