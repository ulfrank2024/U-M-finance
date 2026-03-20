'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Pencil, Check, X, CalendarDays, Settings2 } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import {
  updateShoppingList,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
} from '@/lib/api'
import type { ShoppingList, ShoppingItem, Category } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'

const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

export default function ShoppingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: list, loading, refetch } = useFetch<ShoppingList>(`/api/shopping-lists/${id}`)
  const { data: categories } = useFetch<Category[]>('/api/categories')

  // Item add form
  const [addName, setAddName] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Inline edit item state
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')

  // Edit list modal
  const [showEditList, setShowEditList] = useState(false)
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [editListForm, setEditListForm] = useState({ name: '', planned_date: '', category_id: '' })
  const [editListLoading, setEditListLoading] = useState(false)

  // Status update loading
  const [statusLoading, setStatusLoading] = useState(false)

  // Sync edit form when list loads
  useEffect(() => {
    if (list) {
      setEditListForm({
        name: list.name,
        planned_date: list.planned_date || '',
        category_id: list.category_id || '',
      })
    }
  }, [list])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`shopping-list-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${id}` }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `id=eq.${id}` }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, refetch])

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim()) return
    setAddLoading(true)
    try {
      await addShoppingItem(id, {
        name: addName.trim(),
        quantity: addQty.trim() || undefined,
      })
      setAddName('')
      setAddQty('')
      refetch()
    } finally {
      setAddLoading(false)
    }
  }, [id, addName, addQty, refetch])

  const handleToggleCheck = useCallback(async (item: ShoppingItem) => {
    await updateShoppingItem(id, item.id, { is_checked: !item.is_checked })
    refetch()
  }, [id, refetch])

  const handleDeleteItem = useCallback(async (itemId: string) => {
    await deleteShoppingItem(id, itemId)
    refetch()
  }, [id, refetch])

  const startEdit = (item: ShoppingItem) => {
    setEditItemId(item.id)
    setEditName(item.name)
    setEditQty(item.quantity || '')
  }

  const saveEdit = async (item: ShoppingItem) => {
    await updateShoppingItem(id, item.id, {
      name: editName.trim() || item.name,
      quantity: editQty.trim() || null,
    })
    setEditItemId(null)
    refetch()
  }

  const handleStatusChange = async (newStatus: ShoppingList['status']) => {
    setStatusLoading(true)
    try {
      await updateShoppingList(id, { status: newStatus })
      refetch()
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditListLoading(true)
    try {
      await updateShoppingList(id, {
        name: editListForm.name,
        planned_date: editListForm.planned_date || null,
        category_id: editListForm.category_id || null,
      })
      setShowEditList(false)
      refetch()
    } finally {
      setEditListLoading(false)
    }
  }

  const handleCreateExpense = () => {
    if (!list) return
    const p = new URLSearchParams({ description: list.name })
    if (list.category_id) p.set('category_id', list.category_id)
    if (list.planned_date) p.set('date', list.planned_date)
    router.push(`/transactions/new?${p.toString()}`)
  }

  if (loading || !list) {
    return (
      <div className="min-h-screen bg-[#09090b] px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-[#18181b] border border-[#3f3f46] text-[#a1a1aa]">
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

  const items = list.items || []
  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)
  const selectedCat = (categories || []).find(c => c.id === editListForm.category_id)
  const listCat = list.categories

  return (
    <div className="min-h-screen bg-[#09090b] pb-24">
      {/* Header */}
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
              <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live
              </span>
            </div>
            {list.planned_date && (
              <p className="text-xs text-[#71717a] flex items-center gap-1 mt-0.5">
                <CalendarDays size={11} />
                {new Date(list.planned_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowEditList(true)}
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
            <button
              onClick={() => handleStatusChange('done')}
              disabled={statusLoading}
              className="w-full h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60 bg-emerald-600"
            >
              {statusLoading ? '...' : '✅ Terminer les courses'}
            </button>
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

      <div className="px-4 pt-4">
        {/* Items list */}
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-[#a1a1aa] text-sm">Aucun article. Ajoutez-en ci-dessous.</p>
          </div>
        ) : (
          <div className="space-y-1 mb-4">
            {unchecked.map(item => (
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
            {checked.length > 0 && (
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

        {/* Summary footer */}
        {items.length > 0 && (
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
      </div>

      {/* Edit list modal */}
      {showEditList && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setShowEditList(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Modifier la liste</h3>
            <form onSubmit={handleSaveList} className="space-y-3">
              <input
                placeholder="Nom de la liste"
                value={editListForm.name}
                onChange={e => setEditListForm({ ...editListForm, name: e.target.value })}
                required
                className="w-full h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
              />
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Date prévue (optionnel)</label>
                <div className="flex items-center gap-2 h-11 px-4 bg-[#27272a] border border-[#3f3f46] rounded-xl">
                  <CalendarDays size={16} className="text-[#71717a] flex-shrink-0" />
                  <input
                    type="date"
                    value={editListForm.planned_date}
                    onChange={e => setEditListForm({ ...editListForm, planned_date: e.target.value })}
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
                    <span className="text-[#71717a] text-xs" onClick={e => { e.stopPropagation(); setEditListForm({ ...editListForm, category_id: '' }) }}>✕</span>
                  </>
                ) : (
                  <span className="text-[#71717a]">Catégorie / Magasin (optionnel)</span>
                )}
              </button>
              <button
                type="submit"
                disabled={editListLoading}
                className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
                style={btnStyle}
              >
                {editListLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category picker modal */}
      {showCatPicker && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/60" onClick={() => setShowCatPicker(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] pb-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
              <h3 className="text-base font-bold text-[#fafafa]">Catégorie / Magasin</h3>
              <button onClick={() => setShowCatPicker(false)} className="text-[#71717a] text-lg leading-none">✕</button>
            </div>
            <button
              className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] active:bg-[#27272a]"
              onClick={() => { setEditListForm({ ...editListForm, category_id: '' }); setShowCatPicker(false) }}
            >
              <span className="w-9 h-9 rounded-xl bg-[#27272a] flex items-center justify-center text-lg">—</span>
              <span className={`text-sm ${!editListForm.category_id ? 'text-[#e879f9] font-semibold' : 'text-[#a1a1aa]'}`}>Aucune</span>
              {!editListForm.category_id && <span className="ml-auto text-[#e879f9]">✓</span>}
            </button>
            <div className="overflow-y-auto max-h-72">
              {(categories || []).map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-3 px-6 py-3 border-b border-[#27272a] last:border-0 active:bg-[#27272a]"
                  onClick={() => { setEditListForm({ ...editListForm, category_id: c.id }); setShowCatPicker(false) }}
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${c.color}25` }}>{c.icon}</span>
                  <span className={`text-sm flex-1 text-left ${editListForm.category_id === c.id ? 'text-[#e879f9] font-semibold' : 'text-[#fafafa]'}`}>{c.name}</span>
                  {editListForm.category_id === c.id && <span className="text-[#e879f9]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: ShoppingList['status'] }) {
  if (status === 'open') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Ouverte</span>
  if (status === 'shopping') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">En course</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3f3f46] text-[#71717a]">Terminée</span>
}

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
}

function ItemRow({ item, isEditing, editName, editQty, onEditNameChange, onEditQtyChange, onToggle, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: ItemRowProps) {
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
    <div className={`flex items-center gap-3 py-3 px-3 rounded-2xl border border-[#3f3f46] transition-colors ${item.is_checked ? 'opacity-50' : 'bg-[#18181b]'}`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          item.is_checked ? 'border-[#e879f9] bg-[#e879f9]' : 'border-[#3f3f46] bg-transparent'
        }`}
      >
        {item.is_checked && <Check size={13} className="text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.is_checked ? 'line-through text-[#71717a]' : 'text-[#fafafa]'}`}>
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
        {!item.is_checked && (
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
