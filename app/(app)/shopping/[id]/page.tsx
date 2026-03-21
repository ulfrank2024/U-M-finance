'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Pencil, Check, X, CalendarDays, Settings2, Plus } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import {
  updateShoppingList,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  createShoppingList,
  deleteShoppingList,
  duplicateShoppingList,
  fetchShoppingLists,
} from '@/lib/api'
import type { ShoppingList, ShoppingItem, Category } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import ConfirmModal from '@/components/ui/ConfirmModal'

const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

function StatusPill({ status }: { status: ShoppingList['status'] }) {
  if (status === 'open') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Ouverte</span>
  if (status === 'shopping') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">En course</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3f3f46] text-[#71717a]">Terminée</span>
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
      Live
    </span>
  )
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
// Category Picker Modal (shared between add-sublist and edit)
// ──────────────────────────────────────────────────────────────────────────────
function CategoryPickerModal({
  categories,
  selectedId,
  onSelect,
  onClose,
}: {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-base font-bold text-[#fafafa]">Catégorie / Magasin</h3>
          <button onClick={onClose} className="text-[#71717a] text-lg leading-none">✕</button>
        </div>
        <button
          className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] active:bg-[#27272a]"
          onClick={() => { onSelect(''); onClose() }}
        >
          <span className="w-9 h-9 rounded-xl bg-[#27272a] flex items-center justify-center text-lg">—</span>
          <span className={`text-sm ${!selectedId ? 'text-[#e879f9] font-semibold' : 'text-[#a1a1aa]'}`}>Aucune</span>
          {!selectedId && <span className="ml-auto text-[#e879f9]">✓</span>}
        </button>
        <div className="overflow-y-auto max-h-72">
          {categories.map(c => (
            <button
              key={c.id}
              className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] last:border-0 active:bg-[#27272a]"
              onClick={() => { onSelect(c.id); onClose() }}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: `${c.color}25` }}
              >{c.icon}</span>
              <span className={`text-sm flex-1 text-left ${selectedId === c.id ? 'text-[#e879f9] font-semibold' : 'text-[#fafafa]'}`}>{c.name}</span>
              {selectedId === c.id && <span className="text-[#e879f9]">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Edit List Modal
// ──────────────────────────────────────────────────────────────────────────────
function EditListModal({
  list,
  categories,
  onSave,
  onClose,
  hideCategory,
}: {
  list: ShoppingList
  categories: Category[]
  onSave: (data: { name: string; planned_date: string | null; category_id: string | null }) => Promise<void>
  onClose: () => void
  hideCategory?: boolean
}) {
  const [form, setForm] = useState({
    name: list.name,
    planned_date: list.planned_date || '',
    category_id: list.category_id || '',
  })
  const [loading, setLoading] = useState(false)
  const [showCatPicker, setShowCatPicker] = useState(false)
  const selectedCat = categories.find(c => c.id === form.category_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        name: form.name,
        planned_date: form.planned_date || null,
        category_id: form.category_id || null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
        <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-[#fafafa] mb-4">{hideCategory ? 'Modifier la course' : 'Modifier la liste'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              placeholder="Nom"
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
            {!hideCategory && (
              <button
                type="button"
                onClick={() => setShowCatPicker(true)}
                className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-sm text-left flex items-center gap-2"
              >
                {selectedCat ? (
                  <>
                    <span className="text-base">{selectedCat.icon}</span>
                    <span className="text-[#fafafa] flex-1">{selectedCat.name}</span>
                    <span className="text-[#71717a] text-xs" onClick={e => { e.stopPropagation(); setForm({ ...form, category_id: '' }) }}>✕</span>
                  </>
                ) : (
                  <span className="text-[#71717a]">Catégorie / Magasin (optionnel)</span>
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
              style={btnStyle}
            >
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </form>
        </div>
      </div>
      {showCatPicker && (
        <CategoryPickerModal
          categories={categories}
          selectedId={form.category_id}
          onSelect={id => setForm(f => ({ ...f, category_id: id }))}
          onClose={() => setShowCatPicker(false)}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// ItemRow
// ──────────────────────────────────────────────────────────────────────────────
interface ItemRowProps {
  item: ShoppingItem
  isEditing: boolean
  editName: string
  editQty: string
  onEditNameChange: (v: string) => void
  onEditQtyChange: (v: string) => void
  onToggle: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  hideCheck?: boolean
}

function ItemRow({ item, isEditing, editName, editQty, onEditNameChange, onEditQtyChange, onToggle, onStartEdit, onSaveEdit, onCancelEdit, onDelete, hideCheck }: ItemRowProps) {
  if (isEditing) {
    return (
      <div className="bg-[#18181b] border border-[#e879f9]/40 rounded-2xl p-3 space-y-2">
        <input
          value={editName}
          onChange={e => onEditNameChange(e.target.value)}
          className="w-full h-10 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] text-sm focus:outline-none focus:border-[#e879f9]"
          placeholder="Nom"
          autoFocus
        />
        <input
          value={editQty}
          onChange={e => onEditQtyChange(e.target.value)}
          placeholder="Quantité (ex: 2x, 500g)"
          className="w-full h-9 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] text-sm focus:outline-none focus:border-[#e879f9]"
        />
        <div className="flex gap-2">
          <button onClick={onSaveEdit} className="flex-1 h-9 rounded-xl text-white text-xs font-semibold" style={btnStyle}>
            <Check size={14} className="inline mr-1" />Sauvegarder
          </button>
          <button onClick={onCancelEdit} className="px-4 h-9 rounded-xl bg-[#27272a] text-[#a1a1aa] text-xs">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-2xl border border-[#3f3f46] bg-[#18181b] transition-colors">
      {!hideCheck && (
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            item.is_checked ? 'border-[#e879f9] bg-[#e879f9]' : 'border-[#3f3f46] bg-transparent'
          }`}
        >
          {item.is_checked && <Check size={13} className="text-white" strokeWidth={3} />}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[#fafafa]">
          {item.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {item.quantity && <span className="text-xs text-[#71717a]">{item.quantity}</span>}
          {item.added_by_profile && (
            <div className="flex items-center gap-1">
              <Avatar displayName={item.added_by_profile.display_name} color={item.added_by_profile.avatar_color || '#6366f1'} size="xs" />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {(!item.is_checked || hideCheck) && (
          <button onClick={onStartEdit} className="p-1.5 rounded-lg text-[#71717a]">
            <Pencil size={14} />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg text-[#ef4444]/60">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// SubListCard
// ──────────────────────────────────────────────────────────────────────────────
function SubListCard({
  subList,
  onPress,
  onMarkDone,
  onDelete,
}: {
  subList: ShoppingList
  onPress: () => void
  onMarkDone: () => void
  onDelete: () => void
}) {
  const itemsCount = subList.items_count ?? 0
  const checkedCount = subList.checked_count ?? 0
  const allChecked = itemsCount > 0 && checkedCount === itemsCount
  const isDone = subList.status === 'done'

  return (
    <div
      className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 active:opacity-80 transition-opacity"
      onClick={onPress}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {subList.categories && (
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: `${subList.categories.color}25` }}
              >
                {subList.categories.icon}
              </span>
            )}
            <span className="text-[#fafafa] font-semibold text-sm truncate">{subList.name}</span>
            <StatusPill status={subList.status} />
          </div>
          {subList.planned_date && (
            <p className="text-xs text-[#71717a] mt-0.5 flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(subList.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
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

      {allChecked && !isDone && (
        <button
          className="mt-3 w-full h-9 rounded-xl text-white text-xs font-semibold bg-emerald-600"
          onClick={e => { e.stopPropagation(); onMarkDone() }}
        >
          ✓ Marquer terminée
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Add Sub-list Modal
// ──────────────────────────────────────────────────────────────────────────────
function AddSubListModal({
  parentId,
  categories,
  onCreated,
  onClose,
}: {
  parentId: string
  categories: Category[]
  onCreated: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ name: '', planned_date: '', category_id: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCatPicker, setShowCatPicker] = useState(false)
  const selectedCat = categories.find(c => c.id === form.category_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createShoppingList({
        name: form.name,
        category_id: form.category_id || null,
        planned_date: form.planned_date || null,
        parent_id: parentId,
      })
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
        <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-[#fafafa] mb-4">Ajouter une sous-course</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              placeholder="Nom (ex: Course Super C)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
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
                  <span className="text-[#71717a] text-xs" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, category_id: '' })) }}>✕</span>
                </>
              ) : (
                <span className="text-[#71717a]">Catégorie (optionnel)</span>
              )}
            </button>
            {error && (
              <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
              style={btnStyle}
            >
              {loading ? 'Création...' : 'Créer la sous-course'}
            </button>
          </form>
        </div>
      </div>
      {showCatPicker && (
        <CategoryPickerModal
          categories={categories}
          selectedId={form.category_id}
          onSelect={id => setForm(f => ({ ...f, category_id: id }))}
          onClose={() => setShowCatPicker(false)}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// List Picker Modal (for link existing + duplicate to)
// ──────────────────────────────────────────────────────────────────────────────
function ListPickerModal({
  title,
  lists,
  loading,
  onSelect,
  onClose,
}: {
  title: string
  lists: ShoppingList[]
  loading: boolean
  onSelect: (list: ShoppingList) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-base font-bold text-[#fafafa]">{title}</h3>
          <button onClick={onClose} className="text-[#71717a] text-lg leading-none">✕</button>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-[#71717a] text-sm">Chargement...</div>
        ) : lists.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#71717a] text-sm">Aucune liste disponible</div>
        ) : (
          <div className="overflow-y-auto max-h-72">
            {lists.map(l => (
              <button
                key={l.id}
                className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] last:border-0 active:bg-[#27272a] text-left"
                onClick={() => onSelect(l)}
              >
                {l.categories ? (
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${l.categories.color}25` }}
                  >{l.categories.icon}</span>
                ) : (
                  <span className="w-9 h-9 rounded-xl bg-[#27272a] flex items-center justify-center text-lg flex-shrink-0">🛍️</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#fafafa] font-medium truncate">{l.name}</p>
                  {l.planned_date && (
                    <p className="text-xs text-[#71717a]">
                      {new Date(l.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
                <StatusPill status={l.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Parent View
// ──────────────────────────────────────────────────────────────────────────────
function ParentView({
  list,
  categories,
  refetch,
}: {
  list: ShoppingList
  categories: Category[]
  refetch: () => void
}) {
  const router = useRouter()
  const [statusLoading, setStatusLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAddSubList, setShowAddSubList] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [linkableLists, setLinkableLists] = useState<ShoppingList[]>([])
  const [linkLoading, setLinkLoading] = useState(false)

  const subLists = list.sub_lists || []
  const doneSubs = subLists.filter(sl => sl.status === 'done').length
  const allSubsDone = subLists.length > 0 && doneSubs === subLists.length

  const handleStatusChange = async (newStatus: ShoppingList['status']) => {
    setStatusLoading(true)
    try {
      await updateShoppingList(list.id, { status: newStatus })
      refetch()
    } finally {
      setStatusLoading(false)
    }
  }

  const handleMarkSubDone = async (subId: string) => {
    await updateShoppingList(subId, { status: 'done' })
    refetch()
  }

  const handleDeleteSub = async () => {
    if (!pendingDelete) return
    await deleteShoppingList(pendingDelete)
    setPendingDelete(null)
    refetch()
  }

  const handleSaveEdit = async (data: { name: string; planned_date: string | null; category_id: string | null }) => {
    await updateShoppingList(list.id, data)
    setShowEdit(false)
    refetch()
  }

  const handleCreateExpense = () => {
    const p = new URLSearchParams({ description: list.name })
    if (list.category_id) p.set('category_id', list.category_id)
    if (list.planned_date) p.set('date', list.planned_date)
    router.push(`/transactions/new?${p.toString()}`)
  }

  const handleOpenLinkPicker = async () => {
    setLinkLoading(true)
    setShowLinkPicker(true)
    try {
      const all = await fetchShoppingLists()
      // Exclude current list and already-linked sub-lists
      const subIds = new Set((list.sub_lists || []).map(sl => sl.id))
      setLinkableLists(all.filter(l => l.id !== list.id && !subIds.has(l.id)))
    } finally {
      setLinkLoading(false)
    }
  }

  const handleLinkList = async (selected: ShoppingList) => {
    setShowLinkPicker(false)
    await updateShoppingList(selected.id, { parent_id: list.id })
    refetch()
  }

  const listCat = list.categories

  return (
    <div className="min-h-screen bg-[#09090b] pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#09090b]/95 backdrop-blur-sm border-b border-[#3f3f46] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/shopping')}
            className="p-2 rounded-xl bg-[#18181b] border border-[#3f3f46] text-[#a1a1aa] flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {listCat && <span className="text-base">{listCat.icon}</span>}
              <h1 className="text-base font-bold text-[#fafafa] truncate">{list.name}</h1>
              <StatusPill status={list.status} />
              <LiveBadge />
            </div>
            {list.planned_date && (
              <p className="text-xs text-[#71717a] flex items-center gap-1 mt-0.5">
                <CalendarDays size={11} />
                {new Date(list.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-xl bg-[#18181b] border border-[#3f3f46] text-[#a1a1aa] flex-shrink-0"
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* Status action bar */}
        <div className="mt-3">
          {list.status === 'open' && (
            <button
              onClick={() => handleStatusChange('shopping')}
              disabled={statusLoading}
              className="w-full h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={btnStyle}
            >
              {statusLoading ? '...' : '🛒 Commencer les courses'}
            </button>
          )}
          {list.status === 'shopping' && (
            allSubsDone ? (
              <button
                onClick={() => handleStatusChange('done')}
                disabled={statusLoading}
                className="w-full h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60 bg-emerald-600"
              >
                {statusLoading ? '...' : '✅ Terminer'}
              </button>
            ) : (
              <button
                disabled
                className="w-full h-10 rounded-xl text-[#71717a] text-sm font-semibold disabled:opacity-60 bg-[#27272a] border border-[#3f3f46] cursor-not-allowed"
              >
                {subLists.length === 0
                  ? '✅ Terminer'
                  : `${doneSubs}/${subLists.length} sous-courses terminées`}
              </button>
            )
          )}
          {list.status === 'done' && (
            <button
              onClick={handleCreateExpense}
              className="w-full h-10 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              💳 Créer une dépense
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Sub-lists section */}
        <div>
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
            Sous-courses ({subLists.length})
          </p>
          {subLists.length === 0 ? (
            <div className="py-8 text-center bg-[#18181b] border border-[#3f3f46] rounded-2xl">
              <p className="text-3xl mb-2">🛍️</p>
              <p className="text-[#a1a1aa] text-sm">Aucune sous-course. Ajoutez-en ci-dessous.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subLists.map(sl => (
                <SubListCard
                  key={sl.id}
                  subList={sl}
                  onPress={() => router.push(`/shopping/${sl.id}`)}
                  onMarkDone={() => handleMarkSubDone(sl.id)}
                  onDelete={() => setPendingDelete(sl.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add / link buttons */}
        <div className="space-y-2">
          <button
            onClick={() => setShowAddSubList(true)}
            className="w-full h-12 rounded-2xl border border-dashed border-[#3f3f46] text-[#a1a1aa] text-sm font-medium flex items-center justify-center gap-2 hover:border-[#e879f9] hover:text-[#e879f9] transition-colors"
          >
            <Plus size={16} />
            Ajouter une sous-course
          </button>
          <button
            onClick={handleOpenLinkPicker}
            className="w-full h-12 rounded-2xl border border-dashed border-[#3f3f46] text-[#a1a1aa] text-sm font-medium flex items-center justify-center gap-2 hover:border-[#818cf8] hover:text-[#818cf8] transition-colors"
          >
            <Plus size={16} />
            Lier une liste existante
          </button>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <EditListModal
          list={list}
          categories={categories}
          onSave={handleSaveEdit}
          onClose={() => setShowEdit(false)}
          hideCategory
        />
      )}
      {showAddSubList && (
        <AddSubListModal
          parentId={list.id}
          categories={categories}
          onCreated={() => { setShowAddSubList(false); refetch() }}
          onClose={() => setShowAddSubList(false)}
        />
      )}
      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer la sous-course"
        message="Cette action est irréversible. La sous-course et tous ses articles seront supprimés."
        confirmLabel="Supprimer"
        onConfirm={handleDeleteSub}
        onCancel={() => setPendingDelete(null)}
      />
      {showLinkPicker && (
        <ListPickerModal
          title="Lier une liste existante"
          lists={linkableLists}
          loading={linkLoading}
          onSelect={handleLinkList}
          onClose={() => setShowLinkPicker(false)}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-list View (leaf list with parent_id)
// ──────────────────────────────────────────────────────────────────────────────
function SubListView({
  list,
  categories,
  refetch,
  backHref,
}: {
  list: ShoppingList
  categories: Category[]
  refetch: () => void
  backHref?: string
}) {
  const [addName, setAddName] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAllDoneBanner, setShowAllDoneBanner] = useState(false)
  const [showDuplicatePicker, setShowDuplicatePicker] = useState(false)
  const [duplicatableLists, setDuplicatableLists] = useState<ShoppingList[]>([])
  const [duplicatePickerLoading, setDuplicatePickerLoading] = useState(false)
  const [duplicateSuccess, setDuplicateSuccess] = useState('')

  const items = list.items || []
  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)
  const allChecked = items.length > 0 && checked.length === items.length
  const listCat = list.categories

  // Auto-complete banner
  useEffect(() => {
    if (allChecked && list.status !== 'done') {
      setShowAllDoneBanner(true)
    } else {
      setShowAllDoneBanner(false)
    }
  }, [allChecked, list.status])

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim()) return
    setAddLoading(true)
    try {
      await addShoppingItem(list.id, {
        name: addName.trim(),
        quantity: addQty.trim() || undefined,
      })
      setAddName('')
      setAddQty('')
      refetch()
    } finally {
      setAddLoading(false)
    }
  }, [list.id, addName, addQty, refetch])

  const handleToggleCheck = useCallback(async (item: ShoppingItem) => {
    await updateShoppingItem(list.id, item.id, { is_checked: !item.is_checked })
    refetch()
  }, [list.id, refetch])

  const handleDeleteItem = useCallback(async (itemId: string) => {
    await deleteShoppingItem(list.id, itemId)
    refetch()
  }, [list.id, refetch])

  const startEdit = (item: ShoppingItem) => {
    setEditItemId(item.id)
    setEditName(item.name)
    setEditQty(item.quantity || '')
  }

  const saveEdit = async (item: ShoppingItem) => {
    await updateShoppingItem(list.id, item.id, {
      name: editName.trim() || item.name,
      quantity: editQty.trim() || null,
    })
    setEditItemId(null)
    refetch()
  }

  const handleStatusChange = async (newStatus: ShoppingList['status']) => {
    setStatusLoading(true)
    try {
      await updateShoppingList(list.id, { status: newStatus })
      refetch()
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSaveEdit = async (data: { name: string; planned_date: string | null; category_id: string | null }) => {
    await updateShoppingList(list.id, data)
    setShowEdit(false)
    refetch()
  }

  const handleOpenDuplicatePicker = async () => {
    setDuplicatePickerLoading(true)
    setShowDuplicatePicker(true)
    try {
      const all = await fetchShoppingLists()
      // Exclude current parent
      setDuplicatableLists(all.filter(l => l.id !== list.parent_id))
    } finally {
      setDuplicatePickerLoading(false)
    }
  }

  const handleDuplicateTo = async (target: ShoppingList) => {
    setShowDuplicatePicker(false)
    await duplicateShoppingList(list.id, { parent_id: target.id })
    setDuplicateSuccess(`Dupliqué dans "${target.name}"`)
    setTimeout(() => setDuplicateSuccess(''), 3000)
  }

  return (
    <div className="min-h-screen bg-[#09090b] pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#09090b]/95 backdrop-blur-sm border-b border-[#3f3f46] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref ?? `/shopping/${list.parent_id}`}
            className="p-2 rounded-xl bg-[#18181b] border border-[#3f3f46] text-[#a1a1aa] flex-shrink-0 flex items-center gap-1"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {listCat && (
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: `${listCat.color}25` }}
                >
                  {listCat.icon}
                </span>
              )}
              <h1 className="text-base font-bold text-[#fafafa] truncate">{list.name}</h1>
              {!backHref && <StatusPill status={list.status} />}
              {!backHref && <LiveBadge />}
            </div>
            {list.planned_date && (
              <p className="text-xs text-[#71717a] flex items-center gap-1 mt-0.5">
                <CalendarDays size={11} />
                {new Date(list.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-xl bg-[#18181b] border border-[#3f3f46] text-[#a1a1aa] flex-shrink-0"
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* Status action bar — uniquement pour les sous-listes (dans une course) */}
        {!backHref && (
          <div className="mt-3">
            {list.status === 'open' && (
              <button
                onClick={() => handleStatusChange('shopping')}
                disabled={statusLoading}
                className="w-full h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={btnStyle}
              >
                {statusLoading ? '...' : '🛒 Commencer'}
              </button>
            )}
            {list.status === 'shopping' && allChecked && (
              <button
                onClick={() => handleStatusChange('done')}
                disabled={statusLoading}
                className="w-full h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60 bg-emerald-600"
              >
                {statusLoading ? '...' : '✅ Sous-course terminée'}
              </button>
            )}
            {list.status === 'shopping' && !allChecked && (
              <button
                onClick={() => handleStatusChange('done')}
                disabled={statusLoading}
                className="w-full h-10 rounded-xl text-sm font-semibold disabled:opacity-60 border border-[#3f3f46] text-[#a1a1aa]"
              >
                {statusLoading ? '...' : '✅ Terminer quand même'}
              </button>
            )}
            {list.status === 'done' && (
              <div className="w-full h-10 rounded-xl flex items-center justify-center gap-2 bg-emerald-600/15 border border-emerald-600/30">
                <span className="text-emerald-400 text-sm font-semibold">✅ Terminée</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* All done banner — uniquement dans une course */}
        {!backHref && showAllDoneBanner && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <p className="text-emerald-400 text-sm font-medium flex-1">
              ✅ Tous les articles cochés ! Marquer comme terminée ?
            </p>
            <button
              onClick={() => handleStatusChange('done')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex-shrink-0"
            >
              Terminer
            </button>
          </div>
        )}

        {/* Items list */}
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-[#a1a1aa] text-sm">Aucun article. Ajoutez-en ci-dessous.</p>
          </div>
        ) : (
          <div className="space-y-1 mb-4">
            {(backHref ? items : unchecked).map(item => (
              <ItemRow
                key={item.id}
                item={item}
                isEditing={editItemId === item.id}
                editName={editName}
                editQty={editQty}
                onEditNameChange={setEditName}
                onEditQtyChange={setEditQty}
                onToggle={() => handleToggleCheck(item)}
                onStartEdit={() => startEdit(item)}
                onSaveEdit={() => saveEdit(item)}
                onCancelEdit={() => setEditItemId(null)}
                onDelete={() => handleDeleteItem(item.id)}
                hideCheck={!!backHref}
              />
            ))}
            {!backHref && checked.length > 0 && (
              <>
                <p className="text-xs text-[#71717a] pt-3 pb-1 font-medium">Cochés ({checked.length})</p>
                {checked.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isEditing={editItemId === item.id}
                    editName={editName}
                    editQty={editQty}
                    onEditNameChange={setEditName}
                    onEditQtyChange={setEditQty}
                    onToggle={() => handleToggleCheck(item)}
                    onStartEdit={() => startEdit(item)}
                    onSaveEdit={() => saveEdit(item)}
                    onCancelEdit={() => setEditItemId(null)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Add item form */}
        <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-[#a1a1aa] mb-3">Ajouter un article</p>
          <form onSubmit={handleAddItem} className="space-y-2">
            <input
              placeholder="Nom de l'article (ex: Lait)"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              required
              className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
            />
            <div className="flex gap-2">
              <input
                placeholder="Quantité (ex: 2x, 500g)"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                className="flex-1 h-10 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
              />
              <button
                type="submit"
                disabled={addLoading || !addName.trim()}
                className="px-5 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex-shrink-0"
                style={btnStyle}
              >
                {addLoading ? '...' : '+ Ajouter'}
              </button>
            </div>
          </form>
        </div>

        {/* Summary footer — uniquement dans une course */}
        {!backHref && items.length > 0 && (
          <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-[#a1a1aa]">{checked.length} / {items.length} article{items.length > 1 ? 's' : ''} cochés</span>
              <span className="text-xs text-[#71717a]">{Math.round((checked.length / items.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-[#3f3f46] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((checked.length / items.length) * 100)}%`,
                  background: 'linear-gradient(90deg, #e879f9, #818cf8)',
                }}
              />
            </div>
          </div>
        )}

        {/* Duplicate success toast */}
        {duplicateSuccess && (
          <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
            <span className="text-emerald-400 text-sm font-medium">✅ {duplicateSuccess}</span>
          </div>
        )}

        {/* Duplicate button — uniquement dans une course */}
        {!backHref && (
          <button
            onClick={handleOpenDuplicatePicker}
            className="mt-2 w-full h-11 rounded-2xl border border-dashed border-[#3f3f46] text-[#a1a1aa] text-sm font-medium flex items-center justify-center gap-2 hover:border-[#818cf8] hover:text-[#818cf8] transition-colors"
          >
            <Plus size={15} />
            Dupliquer vers une autre course
          </button>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditListModal
          list={list}
          categories={categories}
          onSave={handleSaveEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showDuplicatePicker && (
        <ListPickerModal
          title="Dupliquer vers..."
          lists={duplicatableLists}
          loading={duplicatePickerLoading}
          onSelect={handleDuplicateTo}
          onClose={() => setShowDuplicatePicker(false)}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page (dispatch to ParentView or SubListView)
// ──────────────────────────────────────────────────────────────────────────────
export default function ShoppingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: list, loading, refetch } = useFetch<ShoppingList>(`/api/shopping-lists/${id}`)
  const { data: categories } = useFetch<Category[]>('/api/categories')

  // Realtime: subscribe to shopping_lists AND shopping_items changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`shopping-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${id}` }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `id=eq.${id}` }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `parent_id=eq.${id}` }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, refetch])

  if (loading || !list) {
    return (
      <div className="min-h-screen bg-[#09090b] px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <button className="p-2 rounded-xl bg-[#18181b] border border-[#3f3f46] text-[#a1a1aa]">
            <ArrowLeft size={18} />
          </button>
          <div className="h-6 w-40 bg-[#18181b] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const cats = categories || []

  // Determine view mode
  const isSubList = !!list.parent_id
  const hasSubLists = (list.sub_lists || []).length > 0

  // Child list → items view with back to parent
  if (isSubList) {
    return <SubListView list={list} categories={cats} refetch={refetch} />
  }

  // Root list with sub-lists → parent view
  if (hasSubLists) {
    return <ParentView list={list} categories={cats} refetch={refetch} />
  }

  // Root list with direct items (or brand new) → simple items view, back → /shopping
  return <SubListView list={list} categories={cats} refetch={refetch} backHref="/shopping" />
}
