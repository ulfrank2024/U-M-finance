'use client'
import { useState, useEffect } from 'react'
import { Plus, X, CreditCard as CardIcon, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFetch } from '@/hooks/useFetch'
import { createCreditCard, addCardPayment, deleteCreditCard, updateCreditCard, deleteCardPayment, fetchBankAccounts } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CreditCard, BankAccount } from '@/lib/types'
import CreditCardWidget from '@/components/CreditCardWidget'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'
import PickerModal from '@/components/ui/PickerModal'
import { ChevronRight } from 'lucide-react'

export default function CreditCardsPage() {
  const { data: cards, loading, refetch } = useFetch<CreditCard[]>('/api/credit-cards')
  const [meId, setMeId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editCard, setEditCard] = useState<CreditCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [showPayAccountPicker, setShowPayAccountPicker] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [form, setForm] = useState({ name: '', last_four: '', credit_limit: '', opening_balance: '', due_date: '', is_shared: false })
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingDeletePayment, setPendingDeletePayment] = useState<{ cardId: string; paymentId: string } | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMeId(user.id)
    })
    fetchBankAccounts().then(setBankAccounts).catch(() => {})
  }, [])

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true); setAddError('')
    try {
      await createCreditCard({
        name: form.name,
        last_four: form.last_four || undefined,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : undefined,
        opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
        due_date: form.due_date ? parseInt(form.due_date) : undefined,
        is_shared: form.is_shared,
      } as Parameters<typeof createCreditCard>[0])
      setShowAdd(false)
      setForm({ name: '', last_four: '', credit_limit: '', opening_balance: '', due_date: '', is_shared: false })
      refetch()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Erreur')
    } finally { setAddLoading(false) }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCard || !paymentAmount) return
    setPayLoading(true); setPayError('')
    try {
      await addCardPayment(selectedCard.id, {
        amount: parseFloat(paymentAmount),
        note: paymentNote || undefined,
        payment_date: paymentDate,
        bank_account_id: paymentAccountId || undefined,
      })
      setSelectedCard(null); setPaymentAmount(''); setPaymentNote('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentAccountId('')
      refetch()
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Erreur')
    } finally { setPayLoading(false) }
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }
  const allCards = cards || []

  // Regrouper : mes cartes / ses cartes / communes
  const myCards      = allCards.filter(c => !c.is_shared && c.owner_id === meId)
  const partnerCards = allCards.filter(c => !c.is_shared && c.owner_id !== meId && c.owner_id !== null)
  const sharedCards  = allCards.filter(c => c.is_shared)

  // Total dette globale
  const totalDebt = allCards.reduce((s, c) => s + Math.max(0, c.current_balance), 0)
  const overLimitCards = allCards.filter(c => c.credit_limit != null && c.current_balance > c.credit_limit)

  function CardSection({ title, items }: { title: string; items: CreditCard[] }) {
    if (!items.length) return null
    return (
      <section>
        <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">{title}</p>
        <div className="space-y-4">
          {items.map(card => (
            <div key={card.id}>
              <CreditCardWidget card={card} />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSelectedCard(card)} className="flex-1 h-9 rounded-xl text-xs font-medium text-white" style={btnStyle}>
                  💳 Paiement
                </button>
                <button onClick={() => setEditCard(card)} className="p-2 rounded-xl bg-[#27272a] text-[#a1a1aa]">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setPendingDelete(card.id)}
                  className="p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Historique paiements */}
              {card.credit_card_payments && card.credit_card_payments.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Derniers paiements</p>
                  {card.credit_card_payments.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-[#18181b] rounded-xl text-xs border border-[#3f3f46]">
                      <div className="flex items-center gap-2">
                        {p.profiles && (
                          <Avatar
                            displayName={p.profiles.display_name}
                            color={p.profiles.avatar_color}
                            avatarUrl={p.profiles.avatar_url}
                            size="xs"
                          />
                        )}
                        <span className="text-[#a1a1aa]">
                          {formatDate(p.payment_date + 'T00:00:00')}
                          {p.note ? ` — ${p.note}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#22c55e] font-semibold">{formatCurrency(p.amount)}</span>
                        <button
                          onClick={() => setPendingDeletePayment({ cardId: card.id, paymentId: p.id })}
                          className="p-1 rounded-lg bg-[#ef4444]/10 text-[#ef4444]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#fafafa]">Cartes de crédit</h1>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl text-white" style={btnStyle}>
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-36 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : !allCards.length ? (
        <EmptyState icon="💳" title="Aucune carte" description="Ajoutez votre première carte de crédit" />
      ) : (
        <div className="space-y-5">
          {/* Résumé global */}
          <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46] space-y-2">
            <p className="text-xs text-[#a1a1aa] font-semibold uppercase tracking-wider">Résumé couple</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#fafafa]">Dette totale</span>
              <span className={`font-bold ${totalDebt > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                {formatCurrency(totalDebt)}
              </span>
            </div>
            {overLimitCards.length > 0 && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-3 py-2">
                <p className="text-xs text-[#ef4444] font-medium">
                  ⚠️ {overLimitCards.length} carte{overLimitCards.length > 1 ? 's' : ''} dépassée{overLimitCards.length > 1 ? 's' : ''} :{' '}
                  {overLimitCards.map(c => c.name).join(', ')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {allCards.map(c => (
                <div key={c.id} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    {c.owner && <Avatar displayName={c.owner.display_name} color={c.owner.avatar_color} avatarUrl={c.owner.avatar_url} size="xs" />}
                    {c.is_shared && <span className="text-[10px] text-[#818cf8]">💑</span>}
                  </div>
                  <p className="text-[10px] text-[#a1a1aa] truncate">{c.name}</p>
                  <p className={`text-xs font-semibold ${c.current_balance > (c.credit_limit || Infinity) ? 'text-[#ef4444]' : 'text-[#fafafa]'}`}>
                    {formatCurrency(c.current_balance)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <CardSection title="Mes cartes" items={myCards} />
          <CardSection title="Ses cartes" items={partnerCards} />
          <CardSection title="Cartes communes" items={sharedCards} />
        </div>
      )}

      {/* Modal ajout carte */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Nouvelle carte</h3>
            <form onSubmit={handleAddCard} className="space-y-3">
              <input placeholder="Nom (ex: Visa Ulrich)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="4 derniers chiffres" maxLength={4} value={form.last_four} onChange={e => setForm({ ...form, last_four: e.target.value })} />
                <input type="number" placeholder="Limite ($)" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Solde déjà utilisé avant l&apos;app ($)</label>
                <input type="number" inputMode="decimal" placeholder="ex: 1680 (laisser vide si 0)" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Jour d'échéance" min={1} max={31} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                <label className="flex items-center gap-2 px-3 py-3 bg-[#27272a] rounded-xl cursor-pointer">
                  <input type="checkbox" checked={form.is_shared} onChange={e => setForm({ ...form, is_shared: e.target.checked })} className="w-auto" />
                  <span className="text-sm text-[#fafafa]">Carte commune</span>
                </label>
              </div>
              {addError && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{addError}</p>}
              <button type="submit" disabled={addLoading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
                {addLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal édition carte */}
      {editCard && (
        <EditCardModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSaved={() => { setEditCard(null); refetch() }}
        />
      )}

      <PickerModal
        isOpen={showPayAccountPicker} title="Compte source du paiement"
        options={bankAccounts.map(a => ({ value: a.id, label: a.name, icon: '🏦', color: a.color }))}
        value={paymentAccountId} onSelect={setPaymentAccountId} onClose={() => setShowPayAccountPicker(false)}
        nullable nullLabel="Non spécifié"
      />

      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Supprimer la carte"
        message="La carte et tout son historique de paiements seront supprimés. Les transactions liées resteront."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (pendingDelete) { await deleteCreditCard(pendingDelete); setPendingDelete(null); refetch() }
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmModal
        isOpen={!!pendingDeletePayment}
        title="Supprimer ce paiement"
        message="Ce paiement sera définitivement supprimé et le solde de la carte sera recalculé."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (pendingDeletePayment) {
            await deleteCardPayment(pendingDeletePayment.cardId, pendingDeletePayment.paymentId)
            setPendingDeletePayment(null)
            refetch()
          }
        }}
        onCancel={() => setPendingDeletePayment(null)}
      />

      {/* Modal paiement */}
      {selectedCard && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-1">Paiement de carte</h3>
            <p className="text-sm text-[#a1a1aa] mb-1">{selectedCard.name}</p>
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#27272a] rounded-xl">
              <CardIcon size={16} className="text-[#a1a1aa]" />
              <div>
                <p className="text-xs text-[#a1a1aa]">Solde dû actuel</p>
                <p className={`text-sm font-bold ${selectedCard.current_balance > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                  {formatCurrency(selectedCard.current_balance)}
                  {selectedCard.credit_limit != null && selectedCard.current_balance > selectedCard.credit_limit && (
                    <span className="text-xs text-[#ef4444] ml-2">⚠️ dépassé de {formatCurrency(selectedCard.current_balance - selectedCard.credit_limit)}</span>
                  )}
                </p>
              </div>
            </div>
            <form onSubmit={handlePayment} className="space-y-3">
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Montant payé ($)</label>
                <input type="number" inputMode="decimal" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Date du paiement</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>
              {bankAccounts.length > 0 && (
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1 block">Compte débité (source du paiement)</label>
                  <button type="button" onClick={() => setShowPayAccountPicker(true)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
                  >
                    <span className={paymentAccountId ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                      {bankAccounts.find(a => a.id === paymentAccountId)
                        ? `🏦 ${bankAccounts.find(a => a.id === paymentAccountId)!.name}`
                        : 'Sélectionner un compte'}
                    </span>
                    <ChevronRight size={16} className="text-[#71717a]" />
                  </button>
                </div>
              )}
              <input placeholder="Note (ex: paiement minimum, solde complet…)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
              {payError && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{payError}</p>}
              <button type="submit" disabled={payLoading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
                {payLoading ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function EditCardModal({ card, onClose, onSaved }: { card: CreditCard; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: card.name,
    last_four: card.last_four || '',
    credit_limit: card.credit_limit ? String(card.credit_limit) : '',
    opening_balance: card.opening_balance ? String(card.opening_balance) : '',
    due_date: card.due_date ? String(card.due_date) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await updateCreditCard(card.id, {
        name: form.name,
        last_four: form.last_four || undefined,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : undefined,
        opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
        due_date: form.due_date ? parseInt(form.due_date) : undefined,
      } as Partial<CreditCard>)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#fafafa] mb-4">Modifier la carte</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <input placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="4 derniers chiffres" maxLength={4} value={form.last_four} onChange={e => setForm({ ...form, last_four: e.target.value })} />
            <input type="number" placeholder="Limite ($)" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#a1a1aa] mb-1 block">Solde déjà utilisé avant l&apos;app ($)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="ex: 1680"
              value={form.opening_balance}
              onChange={e => setForm({ ...form, opening_balance: e.target.value })}
            />
            <p className="text-[11px] text-[#71717a] mt-1">Montant déjà sur la carte avant de commencer à utiliser l&apos;app</p>
          </div>
          <input type="number" placeholder="Jour d'échéance" min={1} max={31} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </form>
      </div>
    </div>
  )
}
