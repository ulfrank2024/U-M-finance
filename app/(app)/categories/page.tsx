'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFetch } from '@/hooks/useFetch'
import { createCategory, updateCategory, deleteCategory } from '@/lib/api'
import type { Category } from '@/lib/types'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'

const PRESET_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#e879f9','#ec4899','#a855f7','#6b7280','#818cf8']

export default function CategoriesPage() {
  const router = useRouter()
  const { data: categories, loading, refetch } = useFetch<Category[]>('/api/categories')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', icon: '📁', color: '#6366f1' })
  const [editForm, setEditForm] = useState({ name: '', icon: '', color: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }
  const fixed = (categories || []).filter(c => c.is_fixed)
  const variable = (categories || []).filter(c => !c.is_fixed)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError('')
    try {
      await createCategory({ name: form.name, icon: form.icon, color: form.color })
      setShowAdd(false)
      setForm({ name: '', icon: '📁', color: '#6366f1' })
      refetch()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setAddLoading(false)
    }
  }

  function startEdit(cat: Category) {
    setEditing(cat.id)
    setEditForm({ name: cat.name, icon: cat.icon, color: cat.color })
  }

  async function handleEdit(id: string) {
    await updateCategory(id, editForm)
    setEditing(null)
    refetch()
  }

  async function handleToggleFixed(cat: Category) {
    await updateCategory(cat.id, { name: cat.name, icon: cat.icon, color: cat.color, is_fixed: !cat.is_fixed })
    refetch()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await deleteCategory(pendingDelete)
    setPendingDelete(null)
    refetch()
  }

  function CategoryList({ items }: { items: Category[] }) {
    return (
      <div className="space-y-2">
        {items.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 p-3 bg-[#18181b] rounded-2xl border border-[#3f3f46]">
            {editing === cat.id ? (
              <>
                <input value={editForm.icon} onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                  className="w-14 text-center text-xl" style={{ padding: '0.5rem' }} />
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="flex-1" style={{ padding: '0.5rem 0.75rem' }} />
                <div className="flex gap-1">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setEditForm({ ...editForm, color: c })}
                      className={`w-5 h-5 rounded-full flex-shrink-0 ${editForm.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#18181b]' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button onClick={() => handleEdit(cat.id)} className="p-1.5 rounded-lg bg-[#22c55e]/20 text-[#22c55e]"><Check size={14} /></button>
                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-[#3f3f46] text-[#a1a1aa]"><X size={14} /></button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${cat.color}25` }}>
                  {cat.icon}
                </div>
                <span className="flex-1 text-sm font-medium text-[#fafafa]">{cat.name}</span>
                <button onClick={() => handleToggleFixed(cat)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors flex-shrink-0 ${
                    cat.is_fixed ? 'bg-[#f97316]/20 text-[#f97316]' : 'bg-[#27272a] text-[#71717a]'
                  }`}>
                  {cat.is_fixed ? '📌 Fixe' : 'Variable'}
                </button>
                <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg bg-[#27272a] text-[#a1a1aa]"><Pencil size={14} /></button>
                <button onClick={() => setPendingDelete(cat.id)} className="p-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444]"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-[#27272a]">
          <ArrowLeft size={20} className="text-[#fafafa]" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#fafafa]">Catégories</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Gérer et marquer les charges fixes</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl text-white" style={btnStyle}>
          <Plus size={20} />
        </button>
      </div>

      {/* Explication */}
      <div className="mb-4 bg-[#f97316]/10 border border-[#f97316]/30 rounded-2xl p-3">
        <p className="text-xs text-[#a1a1aa]">
          Appuie sur <strong className="text-[#f97316]">📌 Variable → Fixe</strong> pour qu&apos;une catégorie apparaisse dans les <strong className="text-[#fafafa]">charges fixes</strong> du rapport mensuel (loyer, abonnements, assurances…).
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-14 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : !categories?.length ? (
        <EmptyState icon="🏷️" title="Aucune catégorie" />
      ) : (
        <div className="space-y-5">
          {fixed.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[#f97316] uppercase tracking-wider mb-2">📌 Charges fixes ({fixed.length})</p>
              <CategoryList items={fixed} />
            </section>
          )}
          <section>
            <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Charges variables ({variable.length})</p>
            <CategoryList items={variable} />
          </section>
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer la catégorie"
        message="Cette action est irréversible. Êtes-vous sûr de vouloir supprimer cette catégorie ?"
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Modal nouvelle catégorie */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Nouvelle catégorie</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex gap-3">
                <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                  placeholder="🏷️" className="text-center text-xl" style={{ width: '3.5rem', flexShrink: 0 }} />
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Nom de la catégorie" required style={{ flex: 1, minWidth: 0 }} />
              </div>
              <div>
                <p className="text-xs text-[#a1a1aa] mb-2">Couleur</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181b]' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              {addError && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{addError}</p>}
              <button type="submit" disabled={addLoading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
                {addLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
