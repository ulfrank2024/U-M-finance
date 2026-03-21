'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ShoppingCart, CalendarDays, List } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { createShoppingList, deleteShoppingList, updateShoppingList } from '@/lib/api'
import type { ShoppingList } from '@/lib/types'
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

// ──────────────────────────────────────────────────────────────────────────────
// Card : liste d'articles (standalone)
// ──────────────────────────────────────────────────────────────────────────────
function ListCard({ list, onPress, onDelete }: { list: ShoppingList; onPress: () => void; onDelete: () => void }) {
  const itemsCount = list.items_count ?? 0

  return (
    <div
      className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 active:opacity-80 transition-opacity"
      onClick={onPress}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {list.categories && <span className="text-base">{list.categories.icon}</span>}
            <span className="text-[#fafafa] font-semibold text-sm truncate">{list.name}</span>
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
      <p className="text-xs text-[#71717a]">
        {itemsCount === 0 ? 'Aucun article' : `${itemsCount} article${itemsCount > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Card : course parente (avec sous-listes)
// ──────────────────────────────────────────────────────────────────────────────
function CourseCard({ list, onPress, onDelete }: { list: ShoppingList; onPress: () => void; onDelete: () => void }) {
  const itemsCount = list.items_count ?? 0
  const checkedCount = list.checked_count ?? 0
  const subCount = list.sub_lists_count ?? 0

  return (
    <div
      className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 active:opacity-80 transition-opacity"
      onClick={onPress}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">🛒</span>
            <span className="text-[#fafafa] font-semibold text-sm truncate">{list.name}</span>
            {statusBadge(list.status)}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {list.planned_date && (
              <p className="text-xs text-[#71717a] flex items-center gap-1">
                <CalendarDays size={11} />
                {new Date(list.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </p>
            )}
            <p className="text-xs text-[#71717a]">{subCount} liste{subCount > 1 ? 's' : ''}</p>
          </div>
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
        {itemsCount === 0 ? 'Aucun article' : `${checkedCount} / ${itemsCount} article${itemsCount > 1 ? 's' : ''} cochés`}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal : Nouvelle liste d'articles
// ──────────────────────────────────────────────────────────────────────────────
function NewListModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const { data: categories } = useFetch<import('@/lib/types').Category[]>('/api/categories')
  const [form, setForm] = useState({ name: '', planned_date: '', category_id: '' })
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCat = (categories || []).find(c => c.id === form.category_id)
  const canSubmit = !!form.name.trim() && !!form.planned_date && !!form.category_id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await createShoppingList({ name: form.name, planned_date: form.planned_date, category_id: form.category_id })
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
        <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-[#fafafa] mb-1">Nouvelle liste</h3>
          <p className="text-xs text-[#71717a] mb-4">Liste d&apos;articles pour un magasin ou catégorie</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              placeholder="Nom de la liste (ex: Super C)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
              className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
            />
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Date <span className="text-[#e879f9]">*</span></label>
              <div className={`flex items-center gap-2 h-11 px-4 bg-[#27272a] border rounded-xl ${!form.planned_date ? 'border-[#ef4444]/50' : 'border-[#3f3f46]'}`}>
                <CalendarDays size={16} className="text-[#71717a] flex-shrink-0" />
                <input
                  type="date"
                  value={form.planned_date}
                  onChange={e => setForm({ ...form, planned_date: e.target.value })}
                  required
                  className="flex-1 bg-transparent text-[#fafafa] text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Catégorie <span className="text-[#e879f9]">*</span></label>
              <button
                type="button"
                onClick={() => setShowCatPicker(true)}
                className={`w-full h-11 px-4 bg-[#27272a] border rounded-xl text-sm text-left flex items-center gap-2 ${!form.category_id ? 'border-[#ef4444]/50' : 'border-[#3f3f46]'}`}
              >
                {selectedCat ? (
                  <>
                    <span className="text-base">{selectedCat.icon}</span>
                    <span className="text-[#fafafa] flex-1">{selectedCat.name}</span>
                    <span className="text-[#71717a] text-xs" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, category_id: '' })) }}>✕</span>
                  </>
                ) : (
                  <span className="text-[#71717a]">Choisir une catégorie…</span>
                )}
              </button>
            </div>
            {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
            <button type="submit" disabled={loading || !canSubmit} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-50" style={btnStyle}>
              {loading ? 'Création...' : 'Créer la liste'}
            </button>
          </form>
        </div>
      </div>
      {showCatPicker && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/60" onClick={() => setShowCatPicker(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] pb-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
              <h3 className="text-base font-bold text-[#fafafa]">Catégorie</h3>
              <button onClick={() => setShowCatPicker(false)} className="text-[#71717a] text-lg">✕</button>
            </div>
            <div className="overflow-y-auto max-h-72">
              {(categories || []).map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] last:border-0 active:bg-[#27272a]"
                  onClick={() => { setForm(f => ({ ...f, category_id: c.id })); setShowCatPicker(false) }}
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${c.color}25` }}>{c.icon}</span>
                  <span className={`text-sm flex-1 text-left ${form.category_id === c.id ? 'text-[#e879f9] font-semibold' : 'text-[#fafafa]'}`}>{c.name}</span>
                  {form.category_id === c.id && <span className="text-[#e879f9]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal : Nouvelle course (parent) avec sélection de listes
// ──────────────────────────────────────────────────────────────────────────────
function NewCourseModal({
  allLists,
  onCreated,
  onClose,
}: {
  allLists: ShoppingList[]
  onCreated: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ name: '', planned_date: '' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Create parent
      const parent = await createShoppingList({ name: form.name, planned_date: form.planned_date || null })
      // Link selected lists
      await Promise.all(
        [...selected].map(id => updateShoppingList(id, { parent_id: parent.id }))
      )
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] pb-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-[#fafafa] mb-1">Nouvelle course</h3>
          <p className="text-xs text-[#71717a]">Regroupez vos listes pour une sortie courses</p>
        </div>

        <div className="px-6 space-y-3 flex-shrink-0">
          <input
            placeholder="Nom de la course (ex: Courses semaine 1)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
            className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
          />
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

        {/* List selection */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider px-6 mb-2">
            Choisir les listes à inclure
          </p>
          {allLists.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#71717a]">Aucune liste disponible — créez d&apos;abord des listes d&apos;articles.</p>
          ) : (
            allLists.map(l => {
              const isSelected = selected.has(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  className={`w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] last:border-0 transition-colors ${isSelected ? 'bg-[#e879f9]/10' : 'active:bg-[#27272a]'}`}
                  onClick={() => toggle(l.id)}
                >
                  {l.categories ? (
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${l.categories.color}25` }}>
                      {l.categories.icon}
                    </span>
                  ) : (
                    <span className="w-9 h-9 rounded-xl bg-[#27272a] flex items-center justify-center flex-shrink-0">
                      <List size={16} className="text-[#71717a]" />
                    </span>
                  )}
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-[#e879f9]' : 'text-[#fafafa]'}`}>{l.name}</p>
                    <p className="text-xs text-[#71717a]">{l.items_count ?? 0} article{(l.items_count ?? 0) > 1 ? 's' : ''}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-[#e879f9] bg-[#e879f9]' : 'border-[#3f3f46]'}`}>
                    {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="px-6 pt-4 flex-shrink-0">
          {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3 mb-3">{error}</p>}
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
              style={btnStyle}
            >
              {loading ? 'Création...' : `Créer la course${selected.size > 0 ? ` avec ${selected.size} liste${selected.size > 1 ? 's' : ''}` : ''}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Page principale
// ──────────────────────────────────────────────────────────────────────────────
export default function ShoppingPage() {
  const router = useRouter()
  // Listes racine pour "Mes courses" (agrégées)
  const { data: rootLists, loading, refetch: refetchRoot } = useFetch<ShoppingList[]>('/api/shopping-lists')
  // Toutes les listes pour "Mes listes" et le picker de course
  const { data: allListsData, refetch: refetchAll } = useFetch<ShoppingList[]>('/api/shopping-lists?all=true')

  const [showNewList, setShowNewList] = useState(false)
  const [showNewCourse, setShowNewCourse] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  function refetch() { refetchRoot(); refetchAll() }

  async function handleDelete() {
    if (!pendingDelete) return
    await deleteShoppingList(pendingDelete)
    setPendingDelete(null)
    refetch()
  }

  // Courses = listes racine avec sous-listes
  const courses = (rootLists || []).filter(l => (l.sub_lists_count ?? 0) > 0)
  // Mes listes = toutes les listes sans sous-listes (standalone ou dans une course)
  const myLists = (allListsData || []).filter(l => (l.sub_lists_count ?? 0) === 0)

  const activeCourses = courses.filter(l => l.status !== 'done')
  const doneCourses = courses.filter(l => l.status === 'done')
  const activeLists = myLists.filter(l => !l.parent_id)
  const doneLists = myLists.filter(l => !l.parent_id && l.status === 'done')
  // Listes déjà dans une course
  const listsInCourse = myLists.filter(l => !!l.parent_id)

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingCart size={22} className="text-[#e879f9]" />
          <h1 className="text-xl font-bold text-[#fafafa]">Courses</h1>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Mes courses (parents) ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-[#fafafa]">Mes courses</p>
                <p className="text-xs text-[#71717a]">Sorties regroupant plusieurs listes</p>
              </div>
              <button
                onClick={() => setShowNewCourse(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-white text-xs font-semibold"
                style={btnStyle}
              >
                <Plus size={14} />
                Nouvelle course
              </button>
            </div>

            {activeCourses.length === 0 && doneCourses.length === 0 ? (
              <div className="py-8 text-center bg-[#18181b] border border-dashed border-[#3f3f46] rounded-2xl">
                <p className="text-2xl mb-2">🛒</p>
                <p className="text-[#71717a] text-sm">Aucune course. Créez-en une pour regrouper vos listes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCourses.map(l => (
                  <CourseCard key={l.id} list={l} onPress={() => router.push(`/shopping/${l.id}`)} onDelete={() => setPendingDelete(l.id)} />
                ))}
                {doneCourses.length > 0 && (
                  <>
                    <p className="text-xs text-[#71717a] pt-1">Terminées</p>
                    {doneCourses.map(l => (
                      <CourseCard key={l.id} list={l} onPress={() => router.push(`/shopping/${l.id}`)} onDelete={() => setPendingDelete(l.id)} />
                    ))}
                  </>
                )}
              </div>
            )}
          </section>

          {/* ── Mes listes ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-[#fafafa]">Mes listes</p>
                <p className="text-xs text-[#71717a]">Articles par magasin ou catégorie</p>
              </div>
              <button
                onClick={() => setShowNewList(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold border border-[#3f3f46] text-[#a1a1aa]"
              >
                <Plus size={14} />
                Nouvelle liste
              </button>
            </div>

            {myLists.length === 0 ? (
              <div className="py-8 text-center bg-[#18181b] border border-dashed border-[#3f3f46] rounded-2xl">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-[#71717a] text-sm">Aucune liste. Créez des listes d&apos;articles par magasin.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLists.map(l => (
                  <ListCard key={l.id} list={l} onPress={() => router.push(`/shopping/${l.id}`)} onDelete={() => setPendingDelete(l.id)} />
                ))}
                {listsInCourse.length > 0 && (
                  <>
                    <p className="text-xs text-[#71717a] pt-1 flex items-center gap-1">
                      🛒 Dans une course
                    </p>
                    {listsInCourse.map(l => (
                      <ListCard key={l.id} list={l} onPress={() => router.push(`/shopping/${l.id}`)} onDelete={() => setPendingDelete(l.id)} />
                    ))}
                  </>
                )}
                {doneLists.length > 0 && (
                  <>
                    <p className="text-xs text-[#71717a] pt-1">Terminées</p>
                    {doneLists.map(l => (
                      <ListCard key={l.id} list={l} onPress={() => router.push(`/shopping/${l.id}`)} onDelete={() => setPendingDelete(l.id)} />
                    ))}
                  </>
                )}
              </div>
            )}
          </section>

        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {showNewList && (
        <NewListModal
          onCreated={() => { setShowNewList(false); refetch() }}
          onClose={() => setShowNewList(false)}
        />
      )}

      {showNewCourse && (
        <NewCourseModal
          allLists={(allListsData || []).filter(l => (l.sub_lists_count ?? 0) === 0)}
          onCreated={() => { setShowNewCourse(false); refetch() }}
          onClose={() => setShowNewCourse(false)}
        />
      )}
    </div>
  )
}
