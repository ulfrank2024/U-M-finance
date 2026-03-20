'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Pencil, Check, X } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import {
  updateShoppingList,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
} from '@/lib/api'
import type { ShoppingList, ShoppingItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'

const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

export default function ShoppingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: list, loading, refetch } = useFetch<ShoppingList>(`/api/shopping-lists/${id}`)

  // Item add form
  const [addName, setAddName] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Inline edit state
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editPrice, setEditPrice] = useState('')

  // Status update loading
  const [statusLoading, setStatusLoading] = useState(false)

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`shopping-list-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${id}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists', filter: `id=eq.${id}` },
        () => refetch()
      )
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
        estimated_price: addPrice ? parseFloat(addPrice) : null,
      })
      setAddName('')
      setAddQty('')
      setAddPrice('')
      refetch()
    } finally {
      setAddLoading(false)
    }
  }, [id, addName, addQty, addPrice, refetch])

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
    setEditPrice(item.estimated_price != null ? String(item.estimated_price) : '')
  }

  const cancelEdit = () => setEditItemId(null)

  const saveEdit = async (item: ShoppingItem) => {
    await updateShoppingItem(id, item.id, {
      name: editName.trim() || item.name,
      quantity: editQty.trim() || null,
      estimated_price: editPrice ? parseFloat(editPrice) : null,
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

  const handleCreateExpense = () => {
    if (!list) return
    const items = list.items || []
    const total = items
      .filter(i => i.is_checked)
      .reduce((sum, i) => sum + (i.actual_price ?? i.estimated_price ?? 0), 0)
    const params = new URLSearchParams({
      description: list.name,
      amount: total.toFixed(2),
    })
    router.push(`/transactions/new?${params.toString()}`)
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
  const estimatedTotal = items.reduce((s, i) => s + (i.estimated_price ?? 0), 0)
  const checkedTotal = checked.reduce((s, i) => s + (i.actual_price ?? i.estimated_price ?? 0), 0)

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
              <h1 className="text-base font-bold text-[#fafafa] truncate">{list.name}</h1>
              <StatusPill status={list.status} />
              <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live
              </span>
            </div>
            {list.store_name && (
              <p className="text-xs text-[#71717a]">{list.store_name}</p>
            )}
          </div>
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
              💳 Créer une dépense ({formatCurrency(checkedTotal)})
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
            {/* Unchecked items */}
            {unchecked.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                isEditing={editItemId === item.id}
                editName={editName}
                editQty={editQty}
                editPrice={editPrice}
                onEditNameChange={setEditName}
                onEditQtyChange={setEditQty}
                onEditPriceChange={setEditPrice}
                onToggle={() => handleToggleCheck(item)}
                onStartEdit={() => startEdit(item)}
                onSaveEdit={() => saveEdit(item)}
                onCancelEdit={cancelEdit}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}

            {/* Checked items */}
            {checked.length > 0 && (
              <>
                <p className="text-xs text-[#71717a] pt-3 pb-1 font-medium">
                  Cochés ({checked.length})
                </p>
                {checked.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isEditing={editItemId === item.id}
                    editName={editName}
                    editQty={editQty}
                    editPrice={editPrice}
                    onEditNameChange={setEditName}
                    onEditQtyChange={setEditQty}
                    onEditPriceChange={setEditPrice}
                    onToggle={() => handleToggleCheck(item)}
                    onStartEdit={() => startEdit(item)}
                    onSaveEdit={() => saveEdit(item)}
                    onCancelEdit={cancelEdit}
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
                placeholder="Qté (ex: 2x)"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                className="flex-1 h-10 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
              />
              <input
                type="number"
                inputMode="decimal"
                placeholder="Prix estimé"
                value={addPrice}
                onChange={e => setAddPrice(e.target.value)}
                className="flex-1 h-10 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#e879f9]"
              />
            </div>
            <button
              type="submit"
              disabled={addLoading || !addName.trim()}
              className="w-full h-11 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={btnStyle}
            >
              {addLoading ? 'Ajout...' : '+ Ajouter'}
            </button>
          </form>
        </div>

        {/* Summary footer */}
        <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#a1a1aa]">
              {checked.length} / {items.length} article{items.length > 1 ? 's' : ''}
            </span>
            <span className="text-[#fafafa] font-semibold">
              Total estimé: {formatCurrency(estimatedTotal)}
            </span>
          </div>
          {checked.length > 0 && checkedTotal !== estimatedTotal && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[#71717a]">Cochés</span>
              <span className="text-[#22c55e]">{formatCurrency(checkedTotal)}</span>
            </div>
          )}
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-[#3f3f46] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: items.length > 0 ? `${Math.round((checked.length / items.length) * 100)}%` : '0%',
                background: 'linear-gradient(90deg, #e879f9, #818cf8)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: ShoppingList['status'] }) {
  if (status === 'open')
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Ouverte</span>
  if (status === 'shopping')
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">En course</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3f3f46] text-[#71717a]">Terminée</span>
}

interface ItemRowProps {
  item: ShoppingItem
  isEditing: boolean
  editName: string
  editQty: string
  editPrice: string
  onEditNameChange: (v: string) => void
  onEditQtyChange: (v: string) => void
  onEditPriceChange: (v: string) => void
  onToggle: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

function ItemRow({
  item,
  isEditing,
  editName,
  editQty,
  editPrice,
  onEditNameChange,
  onEditQtyChange,
  onEditPriceChange,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: ItemRowProps) {
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
        <div className="flex gap-2">
          <input
            value={editQty}
            onChange={e => onEditQtyChange(e.target.value)}
            placeholder="Qté"
            className="flex-1 h-9 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] text-sm focus:outline-none focus:border-[#e879f9]"
          />
          <input
            type="number"
            inputMode="decimal"
            value={editPrice}
            onChange={e => onEditPriceChange(e.target.value)}
            placeholder="Prix"
            className="flex-1 h-9 px-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-[#fafafa] text-sm focus:outline-none focus:border-[#e879f9]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            className="flex-1 h-9 rounded-xl text-white text-xs font-semibold"
            style={btnStyle}
          >
            <Check size={14} className="inline mr-1" />Sauvegarder
          </button>
          <button
            onClick={onCancelEdit}
            className="px-4 h-9 rounded-xl bg-[#27272a] text-[#a1a1aa] text-xs"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 py-3 px-3 rounded-2xl transition-colors ${
      item.is_checked ? 'bg-[#18181b]/50 opacity-60' : 'bg-[#18181b]'
    } border border-[#3f3f46]`}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          item.is_checked
            ? 'border-[#e879f9] bg-[#e879f9]'
            : 'border-[#3f3f46] bg-transparent'
        }`}
      >
        {item.is_checked && <Check size={13} className="text-white" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.is_checked ? 'line-through text-[#71717a]' : 'text-[#fafafa]'}`}>
          {item.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.quantity && (
            <span className="text-xs text-[#71717a]">{item.quantity}</span>
          )}
          {item.estimated_price != null && (
            <span className="text-xs text-[#a1a1aa]">{formatCurrency(item.estimated_price)}</span>
          )}
          {item.added_by_profile && (
            <div className="flex items-center gap-1">
              <Avatar
                displayName={item.added_by_profile.display_name}
                color={item.added_by_profile.avatar_color || '#6366f1'}
                size="xs"
              />
              <span className="text-[10px] text-[#71717a]">{item.added_by_profile.display_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!item.is_checked && (
          <button
            onClick={onStartEdit}
            className="p-1.5 rounded-lg text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-[#ef4444]/60 hover:text-[#ef4444] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}