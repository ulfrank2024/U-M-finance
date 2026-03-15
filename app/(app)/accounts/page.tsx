'use client'
import { useState } from 'react'
import { Plus, Pencil, X, CreditCard, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useFetch } from '@/hooks/useFetch'
import { createBankAccount, updateBankAccount, deleteBankAccount } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount, Profile } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'

const PRESET_COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#e879f9','#14b8a6','#f97316','#a855f7','#ec4899']

export default function AccountsPage() {
  const { data: accounts, loading, refetch } = useFetch<BankAccount[]>('/api/bank-accounts')
  const { data: me } = useFetch<Profile>('/api/profile')
  const meId = me?.id ?? null
  const [showAdd, setShowAdd] = useState(false)
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [form, setForm] = useState({ name: '', color: '#6366f1', is_shared: false })

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }
  const allAccounts = accounts || []
  // owner_id null = créé sans assignation → appartient à l'utilisateur courant
  const myAccounts      = allAccounts.filter(a => !a.is_shared && (a.owner_id === meId || a.owner_id === null))
  const partnerAccounts = allAccounts.filter(a => !a.is_shared && a.owner_id !== null && a.owner_id !== meId)
  const sharedAccounts  = allAccounts.filter(a => a.is_shared)
  const partnerName     = partnerAccounts[0]?.owner?.display_name || 'Partenaire'

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true); setAddError('')
    try {
      await createBankAccount({ name: form.name, color: form.color, is_shared: form.is_shared })
      setShowAdd(false)
      setForm({ name: '', color: '#6366f1', is_shared: false })
      refetch()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Erreur')
    } finally { setAddLoading(false) }
  }

  function AccountSection({ title, items }: { title: string; items: BankAccount[] }) {
    if (!items.length) return null
    return (
      <section>
        <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">{title}</p>
        <div className="space-y-3">
          {items.map(acc => (
            <div key={acc.id} className="bg-[#18181b] rounded-2xl border border-[#3f3f46] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${acc.color}25` }}>
                    <Wallet size={20} style={{ color: acc.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#fafafa] text-sm">{acc.name}</p>
                    {acc.owner && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Avatar displayName={acc.owner.display_name} color={acc.owner.avatar_color} avatarUrl={acc.owner.avatar_url} size="xs" />
                        <span className="text-[11px] text-[#a1a1aa]">{acc.owner.display_name}</span>
                      </div>
                    )}
                    {acc.is_shared && <span className="text-[11px] text-[#818cf8]">💑 Compte commun</span>}
                  </div>
                </div>
                {(acc.is_shared || acc.owner_id === meId || acc.owner_id === null) && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditAccount(acc)} className="p-1.5 rounded-lg bg-[#27272a] text-[#a1a1aa]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setPendingDelete(acc.id)} className="p-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444]">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              {/* Solde */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-[#a1a1aa] mb-0.5">Revenus</p>
                  <p className="text-xs font-semibold text-[#22c55e]">{formatCurrency(acc.total_income)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#a1a1aa] mb-0.5">Dépenses</p>
                  <p className="text-xs font-semibold text-[#ef4444]">{formatCurrency(acc.total_expenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#a1a1aa] mb-0.5">Solde</p>
                  <p className={`text-sm font-bold ${acc.balance >= 0 ? 'text-[#fafafa]' : 'text-[#ef4444]'}`}>
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa]">Comptes</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Débit & crédit</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl text-white" style={btnStyle}>
          <Plus size={20} />
        </button>
      </div>

      {/* Section comptes bancaires */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-[#818cf8]" />
            <h2 className="text-sm font-semibold text-[#fafafa]">Comptes bancaires</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-28 bg-[#18181b] rounded-2xl animate-pulse" />)}
            </div>
          ) : !allAccounts.length ? (
            <EmptyState icon="🏦" title="Aucun compte" description="Ajoutez RBC, Desjardins, etc." />
          ) : (
            <div className="space-y-5">
              <AccountSection title="Mes comptes" items={myAccounts} />
              <AccountSection title={`Comptes de ${partnerName}`} items={partnerAccounts} />
              <AccountSection title="Comptes communs" items={sharedAccounts} />
            </div>
          )}
        </div>

        {/* Lien vers cartes de crédit */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-[#e879f9]" />
            <h2 className="text-sm font-semibold text-[#fafafa]">Cartes de crédit</h2>
          </div>
          <Link href="/credit-cards" className="flex items-center justify-between p-4 bg-[#18181b] rounded-2xl border border-[#3f3f46]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e879f9]/15 flex items-center justify-center">
                <CreditCard size={20} className="text-[#e879f9]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#fafafa]">Gérer les cartes de crédit</p>
                <p className="text-xs text-[#a1a1aa]">Soldes, paiements, historique</p>
              </div>
            </div>
            <span className="text-[#a1a1aa] text-lg">›</span>
          </Link>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer le compte"
        message="Le compte sera supprimé. Les transactions liées ne seront plus rattachées à ce compte."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (pendingDelete) { await deleteBankAccount(pendingDelete); setPendingDelete(null); refetch() }
        }}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Modal ajout compte */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Nouveau compte</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <input placeholder="Nom (ex: RBC Chèques, Desjardins)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <div>
                <p className="text-xs text-[#a1a1aa] mb-2">Couleur</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181b]' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 px-3 py-3 bg-[#27272a] rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.is_shared} onChange={e => setForm({ ...form, is_shared: e.target.checked })} className="w-auto" />
                <span className="text-sm text-[#fafafa]">Compte commun (couple)</span>
              </label>
              {addError && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{addError}</p>}
              <button type="submit" disabled={addLoading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
                {addLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal édition compte */}
      {editAccount && (
        <EditAccountModal
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSaved={() => { setEditAccount(null); refetch() }}
        />
      )}
    </div>
  )
}

function EditAccountModal({ account, onClose, onSaved }: { account: BankAccount; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: account.name, color: account.color })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }
  const PRESET_COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#e879f9','#14b8a6','#f97316','#a855f7','#ec4899']

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await updateBankAccount(account.id, { name: form.name, color: form.color })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#fafafa] mb-4">Modifier le compte</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <input placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div>
            <p className="text-xs text-[#a1a1aa] mb-2">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181b]' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </form>
      </div>
    </div>
  )
}
