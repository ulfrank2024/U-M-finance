'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { fetchTransactions, updateTransaction, fetchCategories, fetchSharedGroups, fetchCreditCards, fetchBankAccounts } from '@/lib/api'
import type { Category, SharedGroup, CreditCard, BankAccount, Transaction } from '@/lib/types'
import PickerModal from '@/components/ui/PickerModal'

const CURRENCIES = [
  { value: 'XAF', label: 'Franc CFA',      subtitle: 'Cameroun · XAF',    icon: '🇨🇲' },
  { value: 'EUR', label: 'Euro',            subtitle: 'Europe · EUR',       icon: '🇪🇺' },
  { value: 'USD', label: 'Dollar US',       subtitle: 'États-Unis · USD',   icon: '🇺🇸' },
  { value: 'GBP', label: 'Livre sterling',  subtitle: 'Royaume-Uni · GBP',  icon: '🇬🇧' },
  { value: 'NGN', label: 'Naira',           subtitle: 'Nigeria · NGN',      icon: '🇳🇬' },
]

export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [scope, setScope] = useState<'personal' | 'common' | 'shared'>('personal')
  const [sharedGroupId, setSharedGroupId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit'>('cash')
  const [date, setDate] = useState('')
  const [isTransfer, setIsTransfer] = useState(false)
  const [foreignCurrency, setForeignCurrency] = useState('XAF')
  const [exchangeRate, setExchangeRate] = useState('')
  const [transferRecipient, setTransferRecipient] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchTransactions({ id }),
      fetchCategories(),
      fetchSharedGroups(),
      fetchCreditCards(true),
      fetchBankAccounts(true),
    ]).then(([txs, cats, groups, cards, accounts]) => {
      const found = (txs as Transaction[]).find(t => t.id === id)
      if (found) {
        setTx(found)
        setAmount(String(found.amount))
        setDescription(found.description || '')
        setCategoryId(found.category_id || '')
        setType(found.type)
        setScope(found.scope)
        setSharedGroupId(found.shared_group_id || '')
        setCreditCardId(found.credit_card_id || '')
        setBankAccountId(found.bank_account_id || '')
        setDate(found.created_at.split('T')[0])
        if (found.credit_card_id) setPaymentMethod('credit')
        else if (found.bank_account_id && found.type === 'expense') setPaymentMethod('debit')
        else setPaymentMethod('cash')
        if (found.exchange_rate) {
          setIsTransfer(true)
          setExchangeRate(String(found.exchange_rate))
          setForeignCurrency(found.foreign_currency || 'XAF')
          setTransferRecipient(found.description?.includes('→') ? found.description.split('→')[1]?.trim() : '')
        }
      }
      setCategories(cats)
      setSharedGroups(groups)
      setCreditCards(cards)
      setBankAccounts(accounts as BankAccount[])
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const rate = isTransfer && exchangeRate ? parseFloat(exchangeRate) : null
      const foreignAmt = rate && amount ? parseFloat(amount) * rate : null
      await updateTransaction(id, {
        amount: parseFloat(amount),
        description: description || undefined,
        category_id: categoryId || undefined,
        type, scope,
        shared_group_id: scope === 'shared' ? sharedGroupId || undefined : undefined,
        credit_card_id: (type === 'expense' && paymentMethod === 'credit') ? creditCardId || undefined : undefined,
        bank_account_id: (paymentMethod === 'debit' || type === 'income') ? bankAccountId || undefined : undefined,
        exchange_rate: rate,
        foreign_amount: foreignAmt,
        foreign_currency: isTransfer ? foreignCurrency : null,
        created_at: new Date(date).toISOString(),
      } as Partial<Transaction>)
      router.push('/transactions')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  const selectedGroup    = sharedGroups.find(g => g.id === sharedGroupId)
  const selectedAccount  = bankAccounts.find(a => a.id === bankAccountId)
  const selectedCard     = creditCards.find(c => c.id === creditCardId)
  const selectedCurrency = CURRENCIES.find(c => c.value === foreignCurrency)

  if (loading) return (
    <div className="px-4 pt-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-14 bg-[#18181b] rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!tx) return (
    <div className="px-4 pt-6 text-center text-[#a1a1aa]">Transaction introuvable</div>
  )

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-[#27272a]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-[#fafafa]">Modifier</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`h-12 rounded-xl font-semibold text-sm transition-all ${type === t ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'}`}
              style={type === t ? (t === 'expense' ? { background: '#ef4444' } : { background: '#22c55e' }) : {}}
            >
              {t === 'expense' ? '💸 Dépense' : '💰 Revenu'}
            </button>
          ))}
        </div>

        <div className="text-center">
          <div className="relative">
            <input type="number" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-center bg-transparent border-0 border-b-2 border-[#3f3f46] rounded-none focus:border-[#e879f9] focus:shadow-none"
              style={{ fontSize: '2.5rem', fontWeight: 'bold' }}
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-xl">$</span>
          </div>
        </div>

        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />

        <div>
          <label className="text-xs text-[#a1a1aa] mb-2 block">Catégorie</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button key={cat.id} type="button"
                onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border border-[#3f3f46] bg-[#18181b] transition-all"
                style={categoryId === cat.id ? { backgroundColor: `${cat.color}20`, borderColor: cat.color } : {}}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px] text-[#a1a1aa] max-w-[56px] text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#a1a1aa] mb-2 block">Portée</label>
          <div className="grid grid-cols-3 gap-2">
            {([{ key: 'personal', label: 'Personnel' }, { key: 'common', label: 'Commun' }, { key: 'shared', label: 'Partagé' }] as const).map(s => (
              <button key={s.key} type="button" onClick={() => setScope(s.key)}
                className={`h-10 rounded-xl text-xs font-medium ${scope === s.key ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'}`}
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
            <button type="button" onClick={() => setShowGroupPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
            >
              <span className={selectedGroup ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                {selectedGroup ? `🤝 ${selectedGroup.name}` : 'Sélectionner un groupe'}
              </span>
              <ChevronRight size={16} className="text-[#71717a]" />
            </button>
          </div>
        )}

        {/* Mode de paiement */}
        {type === 'expense' ? (
          <div>
            <label className="text-xs text-[#a1a1aa] mb-2 block">Mode de paiement</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { key: 'cash',   label: '💵 Comptant' },
                { key: 'debit',  label: '🏦 Débit' },
                { key: 'credit', label: '💳 Crédit' },
              ] as { key: 'cash'|'debit'|'credit'; label: string }[]).map(m => (
                <button key={m.key} type="button"
                  onClick={() => { setPaymentMethod(m.key); if (m.key !== 'credit') setCreditCardId(''); if (m.key !== 'debit') setBankAccountId('') }}
                  className={`h-10 rounded-xl text-xs font-medium transition-all ${paymentMethod === m.key ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'}`}
                  style={paymentMethod === m.key ? btnStyle : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'debit' && bankAccounts.length > 0 && (
              <button type="button" onClick={() => setShowAccountPicker(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
              >
                <span className={selectedAccount ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                  {selectedAccount ? `🏦 ${selectedAccount.name}` : 'Choisir un compte'}
                </span>
                <ChevronRight size={16} className="text-[#71717a]" />
              </button>
            )}
            {paymentMethod === 'credit' && creditCards.length > 0 && (
              <button type="button" onClick={() => setShowCardPicker(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
              >
                <span className={selectedCard ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                  {selectedCard ? `💳 ${selectedCard.name}${selectedCard.last_four ? ` ••${selectedCard.last_four}` : ''}` : 'Choisir une carte'}
                </span>
                <ChevronRight size={16} className="text-[#71717a]" />
              </button>
            )}
          </div>
        ) : (
          bankAccounts.length > 0 && (
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Compte crédité</label>
              <button type="button" onClick={() => setShowAccountPicker(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
              >
                <span className={selectedAccount ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                  {selectedAccount ? `🏦 ${selectedAccount.name}` : 'Sélectionner un compte'}
                </span>
                <ChevronRight size={16} className="text-[#71717a]" />
              </button>
            </div>
          )
        )}

        <div>
          <label className="text-xs text-[#a1a1aa] mb-1 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Envoi en devises étrangères */}
        <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
          <button type="button" onClick={() => setIsTransfer(!isTransfer)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2 text-[#a1a1aa]">
              <span>🌍</span> Envoi en devises étrangères
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full transition-colors ${isTransfer ? 'bg-[#e879f9]/20 text-[#e879f9]' : 'bg-[#27272a] text-[#71717a]'}`}>
              {isTransfer ? 'Activé' : 'Optionnel'}
            </span>
          </button>
          {isTransfer && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#3f3f46]">
              <div className="pt-3">
                <label className="text-xs text-[#a1a1aa] mb-1 block">Destinataire (optionnel)</label>
                <input value={transferRecipient} onChange={e => setTransferRecipient(e.target.value)}
                  placeholder="ex: Maman, ami Paul, aide église…" />
              </div>
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Devise de destination</label>
                <button type="button" onClick={() => setShowCurrencyPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
                >
                  <span className="text-[#fafafa]">
                    {selectedCurrency ? `${selectedCurrency.icon} ${selectedCurrency.label} (${selectedCurrency.value})` : foreignCurrency}
                  </span>
                  <ChevronRight size={16} className="text-[#71717a]" />
                </button>
              </div>
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">
                  Taux de change (1 CAD = ? {foreignCurrency})
                </label>
                <input type="number" inputMode="decimal" value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  placeholder={foreignCurrency === 'XAF' ? 'ex: 488' : 'ex: 0.74'} />
              </div>
              {exchangeRate && amount && (
                <div className="bg-[#27272a] rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-[#a1a1aa]">{transferRecipient || 'Destinataire'} reçoit</span>
                  <span className="font-bold text-[#e879f9]">
                    {(parseFloat(amount) * parseFloat(exchangeRate)).toLocaleString('fr-FR')} {foreignCurrency}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
          style={btnStyle}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </form>

      {/* Pickers */}
      <PickerModal
        isOpen={showGroupPicker} title="Groupe partagé"
        options={sharedGroups.map(g => ({ value: g.id, label: g.name, icon: '🤝' }))}
        value={sharedGroupId} onSelect={setSharedGroupId} onClose={() => setShowGroupPicker(false)}
        nullable nullLabel="Aucun groupe"
      />
      <PickerModal
        isOpen={showAccountPicker} title="Compte bancaire"
        options={bankAccounts.map(a => ({ value: a.id, label: a.name, icon: '🏦', color: a.color }))}
        value={bankAccountId} onSelect={setBankAccountId} onClose={() => setShowAccountPicker(false)}
        nullable nullLabel="Aucun compte"
      />
      <PickerModal
        isOpen={showCardPicker} title="Carte de crédit"
        options={creditCards.map(c => ({ value: c.id, label: c.name, icon: '💳', subtitle: c.last_four ? `••${c.last_four}` : undefined }))}
        value={creditCardId} onSelect={setCreditCardId} onClose={() => setShowCardPicker(false)}
        nullable nullLabel="Aucune carte"
      />
      <PickerModal
        isOpen={showCurrencyPicker} title="Devise de destination"
        options={CURRENCIES.map(c => ({ value: c.value, label: c.label, icon: c.icon, subtitle: c.subtitle }))}
        value={foreignCurrency} onSelect={setForeignCurrency} onClose={() => setShowCurrencyPicker(false)}
      />
    </div>
  )
}
