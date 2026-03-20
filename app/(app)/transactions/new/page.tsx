'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { createTransaction, fetchCategories, fetchSharedGroups, fetchCreditCards, fetchBankAccounts, addCardPayment } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Category, SharedGroup, CreditCard, BankAccount } from '@/lib/types'
import PickerModal from '@/components/ui/PickerModal'

type TxType = 'expense' | 'income' | 'card_payment'
type TxScope = 'personal' | 'common' | 'shared'

const CURRENCIES = [
  { value: 'XAF', label: 'Franc CFA', subtitle: 'Cameroun · XAF', icon: '🇨🇲' },
  { value: 'EUR', label: 'Euro',       subtitle: 'Europe · EUR',   icon: '🇪🇺' },
  { value: 'USD', label: 'Dollar US',  subtitle: 'États-Unis · USD', icon: '🇺🇸' },
  { value: 'GBP', label: 'Livre sterling', subtitle: 'Royaume-Uni · GBP', icon: '🇬🇧' },
  { value: 'NGN', label: 'Naira',      subtitle: 'Nigeria · NGN',  icon: '🇳🇬' },
]

export default function NewTransactionPageWrapper() {
  return (
    <Suspense>
      <NewTransactionPage />
    </Suspense>
  )
}

function NewTransactionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [type, setType] = useState<TxType>('expense')
  const [scope, setScope] = useState<TxScope>('personal')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState(() => searchParams.get('description') || '')
  const [categoryId, setCategoryId] = useState(() => searchParams.get('category_id') || '')
  const [sharedGroupId, setSharedGroupId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit'>('cash')
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().split('T')[0])
  const [isTransfer, setIsTransfer] = useState(false)
  const [foreignCurrency, setForeignCurrency] = useState('XAF')
  const [exchangeRate, setExchangeRate] = useState('')
  const [transferRecipient, setTransferRecipient] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState<number>(new Date().getDate())
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])        // mes cartes (dépenses)
  const [allCreditCards, setAllCreditCards] = useState<CreditCard[]>([]) // toutes (remboursement)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  // Pickers ouverts
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
    fetchSharedGroups().then(setSharedGroups).catch(() => {})
    fetchCreditCards(true).then(setCreditCards).catch(() => {})   // mes cartes pour dépenses
    fetchCreditCards(false).then(setAllCreditCards).catch(() => {})
    fetchBankAccounts(true).then(setBankAccounts).catch(() => {})
  }, [])

  async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setUploadingReceipt(true)
    setError('')
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      setReceiptUrl(urlData.publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur upload reçu')
      setReceiptFile(null)
    } finally {
      setUploadingReceipt(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) { setError('Montant invalide'); return }
    setLoading(true)
    setError('')
    try {
      // Validation solde pour paiement débit
      if (type === 'expense' && paymentMethod === 'debit' && bankAccountId) {
        const account = bankAccounts.find(a => a.id === bankAccountId)
        if (account && account.balance < parseFloat(amount)) {
          setError(`Solde insuffisant — disponible : ${formatCurrency(account.balance)}`)
          setLoading(false)
          return
        }
      }

      if (type === 'card_payment') {
        if (!creditCardId) { setError('Sélectionne une carte'); setLoading(false); return }
        await addCardPayment(creditCardId, {
          amount: parseFloat(amount),
          note: description || undefined,
          payment_date: date,
          bank_account_id: bankAccountId || undefined,
        })
        router.push('/transactions')
        return
      }
      const rate = isTransfer && exchangeRate ? parseFloat(exchangeRate) : null
      const foreignAmt = rate && amount ? parseFloat(amount) * rate : null
      const finalDescription = isTransfer && transferRecipient && !description
        ? `Envoi → ${transferRecipient}`
        : description || undefined
      await createTransaction({
        amount: parseFloat(amount),
        description: finalDescription,
        category_id: categoryId || undefined,
        type: type as 'expense' | 'income',
        scope,
        shared_group_id: scope === 'shared' ? sharedGroupId || undefined : undefined,
        credit_card_id: (type === 'expense' && paymentMethod === 'credit') ? creditCardId || undefined : undefined,
        bank_account_id: (paymentMethod === 'debit' || type === 'income') ? bankAccountId || undefined : undefined,
        exchange_rate: rate ?? undefined,
        foreign_amount: foreignAmt ?? undefined,
        foreign_currency: isTransfer ? foreignCurrency : undefined,
        created_at: new Date(date).toISOString(),
        receipt_url: receiptUrl ?? undefined,
        is_recurring: isRecurring || undefined,
        recurring_day: isRecurring ? recurringDay : undefined,
      } as Parameters<typeof createTransaction>[0])
      router.push('/transactions')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  const selectedGroup    = sharedGroups.find(g => g.id === sharedGroupId)
  const selectedAccount  = bankAccounts.find(a => a.id === bankAccountId)
  const selectedCard     = creditCards.find(c => c.id === creditCardId)
  const selectedCurrency = CURRENCIES.find(c => c.value === foreignCurrency)

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-[#27272a]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-[#fafafa]">Nouvelle transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'expense',      label: '💸 Dépense',    activeColor: '#ef4444' },
            { key: 'income',       label: '💰 Revenu',     activeColor: '#22c55e' },
            { key: 'card_payment', label: '💳 Remb. carte', activeColor: '#8b5cf6' },
          ] as { key: TxType; label: string; activeColor: string }[]).map(t => (
            <button key={t.key} type="button"
              onClick={() => { setType(t.key); setCreditCardId(''); setBankAccountId('') }}
              className={`h-12 rounded-xl font-semibold text-xs transition-all ${
                type === t.key ? 'text-white shadow-lg' : 'bg-[#27272a] text-[#a1a1aa]'
              }`}
              style={type === t.key ? { background: t.activeColor } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Formulaire simplifié pour remboursement carte */}
        {type === 'card_payment' && (
          <>
            <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-2xl p-3">
              <p className="text-xs text-[#a1a1aa]">
                💳 Rembourse une carte de crédit. Le solde de la carte sera réduit et le compte bancaire débité.
              </p>
            </div>
            <div className="text-center">
              <div className="relative">
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-center text-4xl font-bold bg-transparent border-0 border-b-2 border-[#3f3f46] rounded-none focus:border-[#8b5cf6] focus:shadow-none"
                  style={{ fontSize: '2.5rem' }} autoFocus required />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-xl">$</span>
              </div>
            </div>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Note (optionnel)" />
            <div className="space-y-2">
              <label className="text-xs text-[#a1a1aa] mb-1 block">Carte à rembourser *</label>
              <button type="button" onClick={() => setShowCardPicker(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm">
                {(() => {
                  const sc = allCreditCards.find(c => c.id === creditCardId)
                  return (
                    <span className={sc ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                      {sc ? `💳 ${sc.name}${sc.last_four ? ` ••${sc.last_four}` : ''}` : 'Sélectionner la carte'}
                    </span>
                  )
                })()}
                <ChevronRight size={16} className="text-[#71717a]" />
              </button>
              {(() => {
                const sc = allCreditCards.find(c => c.id === creditCardId)
                if (!sc || sc.current_balance <= 0) return null
                return (
                  <div className="flex items-center justify-between px-3 py-2 bg-[#ef4444]/10 rounded-xl">
                    <span className="text-xs text-[#a1a1aa]">Solde dû</span>
                    <span className="text-xs font-semibold text-[#ef4444]">{formatCurrency(sc.current_balance)}</span>
                  </div>
                )
              })()}
            </div>
            {bankAccounts.length > 0 && (
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Payé depuis (optionnel)</label>
                <button type="button" onClick={() => setShowAccountPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm">
                  <span className={bankAccounts.find(a => a.id === bankAccountId) ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                    {bankAccounts.find(a => a.id === bankAccountId)
                      ? `🏦 ${bankAccounts.find(a => a.id === bankAccountId)!.name}`
                      : 'Choisir un compte'}
                  </span>
                  <ChevronRight size={16} className="text-[#71717a]" />
                </button>
              </div>
            )}
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: '#8b5cf6' }}>
              {loading ? 'Enregistrement...' : 'Rembourser la carte'}
            </button>
          </>
        )}

        {/* Formulaire dépense / revenu */}
        {type !== 'card_payment' && (<>

        {/* Montant */}
        <div className="text-center">
          <div className="relative">
            <input
              type="number" inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-center text-4xl font-bold bg-transparent border-0 border-b-2 border-[#3f3f46] rounded-none focus:border-[#e879f9] focus:shadow-none"
              style={{ fontSize: '2.5rem' }}
              autoFocus required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a1a1aa] text-xl">$</span>
          </div>
        </div>

        {/* Description */}
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)" />

        {/* Catégorie */}
        <div>
          <label className="text-xs text-[#a1a1aa] mb-2 block">Catégorie</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button key={cat.id} type="button"
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
              <div className="space-y-2">
                <button type="button" onClick={() => setShowAccountPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#27272a] rounded-xl text-sm"
                >
                  <span className={selectedAccount ? 'text-[#fafafa]' : 'text-[#71717a]'}>
                    {selectedAccount ? `🏦 ${selectedAccount.name}` : 'Choisir un compte'}
                  </span>
                  <ChevronRight size={16} className="text-[#71717a]" />
                </button>
                {selectedAccount && (() => {
                  const insufficient = amount && !isNaN(parseFloat(amount)) && selectedAccount.balance < parseFloat(amount)
                  return (
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${insufficient ? 'bg-[#ef4444]/10' : 'bg-[#27272a]'}`}>
                      <span className="text-xs text-[#a1a1aa]">Solde disponible</span>
                      <span className={`text-xs font-semibold ${insufficient ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                        {formatCurrency(selectedAccount.balance)}
                        {insufficient && ' ⚠️'}
                      </span>
                    </div>
                  )
                })()}
              </div>
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

        {/* Date */}
        <div>
          <label className="text-xs text-[#a1a1aa] mb-1 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Transaction récurrente */}
        <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
          <button type="button" onClick={() => setIsRecurring(!isRecurring)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2 text-[#a1a1aa]">
              <span>🔄</span> Transaction récurrente
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full transition-colors ${isRecurring ? 'bg-[#818cf8]/20 text-[#818cf8]' : 'bg-[#27272a] text-[#71717a]'}`}>
              {isRecurring ? 'Activé' : 'Optionnel'}
            </span>
          </button>
          {isRecurring && (
            <div className="px-4 pb-4 border-t border-[#3f3f46]">
              <div className="pt-3">
                <label className="text-xs text-[#a1a1aa] mb-1 block">Jour du mois (1–31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={recurringDay}
                  onChange={e => setRecurringDay(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Photo de reçu */}
        <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] p-4">
          <label className="text-xs text-[#a1a1aa] mb-2 block">📎 Ajouter un reçu (optionnel)</label>
          <label className="cursor-pointer flex items-center gap-3">
            <span className="px-4 py-2 bg-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#3f3f46] transition-colors">
              {uploadingReceipt ? 'Envoi...' : receiptFile ? receiptFile.name : 'Choisir une image'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReceiptChange}
              disabled={uploadingReceipt}
            />
          </label>
          {receiptUrl && !uploadingReceipt && (
            <div className="mt-2 flex items-center gap-2">
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#e879f9] underline">
                Voir le reçu
              </a>
              <button type="button" onClick={() => { setReceiptUrl(null); setReceiptFile(null) }}
                className="text-xs text-[#71717a] hover:text-[#ef4444]">
                ✕ Retirer
              </button>
            </div>
          )}
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

        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={btnStyle}
        >
          {loading ? 'Ajout...' : 'Ajouter'}
        </button>
        </>)}
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
        isOpen={showCardPicker}
        title={type === 'card_payment' ? 'Carte à rembourser' : 'Carte de crédit'}
        options={(type === 'card_payment' ? allCreditCards : creditCards).map(c => ({
          value: c.id,
          label: `${c.name}${c.last_four ? ` ••${c.last_four}` : ''}`,
          icon: '💳',
          subtitle: c.current_balance > 0 ? `Solde dû : ${c.current_balance.toFixed(2)} $` : 'Solde : 0 $',
        }))}
        value={creditCardId} onSelect={setCreditCardId} onClose={() => setShowCardPicker(false)}
        nullable={type !== 'card_payment'} nullLabel="Aucune carte"
      />
      <PickerModal
        isOpen={showCurrencyPicker} title="Devise de destination"
        options={CURRENCIES.map(c => ({ value: c.value, label: c.label, icon: c.icon, subtitle: c.subtitle }))}
        value={foreignCurrency} onSelect={setForeignCurrency} onClose={() => setShowCurrencyPicker(false)}
      />
    </div>
  )
}
