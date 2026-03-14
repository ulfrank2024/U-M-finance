'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { createCreditCard, addCardPayment, deleteCreditCard } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { CreditCard } from '@/lib/types'
import CreditCardWidget from '@/components/CreditCardWidget'
import EmptyState from '@/components/ui/EmptyState'

export default function CreditCardsPage() {
  const { data: cards, loading, refetch } = useFetch<CreditCard[]>('/api/credit-cards')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [form, setForm] = useState({ name: '', last_four: '', credit_limit: '', due_date: '', is_shared: false })

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    await createCreditCard({
      name: form.name,
      last_four: form.last_four || undefined,
      credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : undefined,
      due_date: form.due_date ? parseInt(form.due_date) : undefined,
      is_shared: form.is_shared,
    } as Parameters<typeof createCreditCard>[0])
    setShowAdd(false)
    setForm({ name: '', last_four: '', credit_limit: '', due_date: '', is_shared: false })
    refetch()
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCard || !paymentAmount) return
    await addCardPayment(selectedCard.id, { amount: parseFloat(paymentAmount), note: paymentNote || undefined })
    setSelectedCard(null)
    setPaymentAmount('')
    setPaymentNote('')
    refetch()
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-[#fafafa]">Cartes de crédit</h1>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl text-white" style={btnStyle}>
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-36 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : !cards?.length ? (
        <EmptyState icon="💳" title="Aucune carte" description="Ajoutez votre première carte de crédit" />
      ) : (
        <div className="space-y-4">
          {cards.map(card => (
            <div key={card.id}>
              <CreditCardWidget card={card} />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setSelectedCard(card)}
                  className="flex-1 h-9 rounded-xl text-xs font-medium text-white"
                  style={btnStyle}
                >
                  Ajouter un remboursement
                </button>
                <button
                  onClick={async () => { if (confirm('Supprimer cette carte ?')) { await deleteCreditCard(card.id); refetch() } }}
                  className="p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Historique paiements */}
              {card.credit_card_payments && card.credit_card_payments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {card.credit_card_payments.slice(0, 3).map(p => (
                    <div key={p.id} className="flex justify-between items-center px-3 py-2 bg-[#18181b] rounded-xl text-xs">
                      <span className="text-[#a1a1aa]">{p.payment_date} — {p.note || 'Remboursement'}</span>
                      <span className="text-[#22c55e] font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Jour d'échéance" min={1} max={31} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                <label className="flex items-center gap-2 px-3 py-3 bg-[#27272a] rounded-xl cursor-pointer">
                  <input type="checkbox" checked={form.is_shared} onChange={e => setForm({ ...form, is_shared: e.target.checked })} className="w-auto" />
                  <span className="text-sm text-[#fafafa]">Carte commune</span>
                </label>
              </div>
              <button type="submit" className="w-full h-12 rounded-xl font-semibold text-white" style={btnStyle}>Ajouter</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal remboursement */}
      {selectedCard && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-1">Remboursement</h3>
            <p className="text-sm text-[#a1a1aa] mb-4">{selectedCard.name}</p>
            <form onSubmit={handlePayment} className="space-y-3">
              <input type="number" inputMode="decimal" placeholder="Montant ($)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
              <input placeholder="Note (optionnel)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
              <button type="submit" className="w-full h-12 rounded-xl font-semibold text-white" style={btnStyle}>Enregistrer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
