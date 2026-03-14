'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createTransaction, fetchCategories, fetchSharedGroups, fetchCreditCards } from '@/lib/api'
import type { Category, SharedGroup, CreditCard } from '@/lib/types'

type TxType = 'expense' | 'income'
type TxScope = 'personal' | 'common' | 'shared'

export default function NewTransactionPage() {
  const router = useRouter()
  const [type, setType] = useState<TxType>('expense')
  const [scope, setScope] = useState<TxScope>('personal')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sharedGroupId, setSharedGroupId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
    fetchSharedGroups().then(setSharedGroups).catch(() => {})
    fetchCreditCards().then(setCreditCards).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) { setError('Montant invalide'); return }
    setLoading(true)
    setError('')
    try {
      await createTransaction({
        amount: parseFloat(amount),
        description: description || undefined,
        category_id: categoryId || undefined,
        type,
        scope,
        shared_group_id: scope === 'shared' ? sharedGroupId || undefined : undefined,
        credit_card_id: creditCardId || undefined,
        created_at: new Date(date).toISOString(),
      } as Parameters<typeof createTransaction>[0])
      router.push('/transactions')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-[#27272a]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-[#fafafa]">Nouvelle transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as TxType[]).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`h-12 rounded-xl font-semibold text-sm transition-all ${
                type === t ? 'text-white shadow-lg' : 'bg-[#27272a] text-[#a1a1aa]'
              }`}
              style={type === t ? (t === 'expense' ? { background: '#ef4444' } : { background: '#22c55e' }) : {}}
            >
              {t === 'expense' ? '💸 Dépense' : '💰 Revenu'}
            </button>
          ))}
        </div>

        {/* Montant */}
        <div className="text-center">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-center text-4xl font-bold bg-transparent border-0 border-b-2 border-[#3f3f46] rounded-none focus:border-[#e879f9] focus:shadow-none"
              style={{ fontSize: '2.5rem' }}
              autoFocus
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-xl">€</span>
          </div>
        </div>

        {/* Description */}
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optionnel)"
        />

        {/* Catégorie */}
        <div>
          <label className="text-xs text-[#a1a1aa] mb-2 block">Catégorie</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  categoryId === cat.id ? 'border-[#e879f9]' : 'border-[#3f3f46] bg-[#18181b]'
                }`}
                style={categoryId === cat.id ? { backgroundColor: `${cat.color}20`, borderColor: cat.color } : {}}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px] text-[#a1a1aa] max-w-[56px] text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Portée */}
        <div>
          <label className="text-xs text-[#a1a1aa] mb-2 block">Portée</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'personal', label: 'Personnel' },
              { key: 'common',   label: 'Commun' },
              { key: 'shared',   label: 'Partagé' },
            ] as { key: TxScope; label: string }[]).map(s => (
              <button key={s.key} type="button" onClick={() => setScope(s.key)}
                className={`h-10 rounded-xl text-xs font-medium transition-all ${
                  scope === s.key ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'
                }`}
                style={scope === s.key ? btnStyle : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Groupe partagé */}
        {scope === 'shared' && sharedGroups.length > 0 && (
          <div>
            <label className="text-xs text-[#a1a1aa] mb-1 block">Groupe partagé</label>
            <select value={sharedGroupId} onChange={e => setSharedGroupId(e.target.value)}>
              <option value="">Sélectionner un groupe</option>
              {sharedGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        {/* Carte de crédit */}
        {type === 'expense' && creditCards.length > 0 && (
          <div>
            <label className="text-xs text-[#a1a1aa] mb-1 block">Carte de crédit (optionnel)</label>
            <select value={creditCardId} onChange={e => setCreditCardId(e.target.value)}>
              <option value="">Paiement direct</option>
              {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}{c.last_four ? ` ••${c.last_four}` : ''}</option>)}
            </select>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs text-[#a1a1aa] mb-1 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={btnStyle}
        >
          {loading ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>
    </div>
  )
}
