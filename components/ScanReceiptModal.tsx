'use client'
import { useState, useRef, useCallback } from 'react'
import { X, Camera, Loader2, CheckCircle, Trash2, ChevronDown, ScanLine, AlertCircle } from 'lucide-react'
import { createTransaction, fetchBankAccounts } from '@/lib/api'
import type { BankAccount, Category } from '@/lib/types'

interface ScannedItem {
  name: string
  brand: string
  unit: string
  quantity: number
  unit_price: number
  include: boolean
}

interface ScanResult {
  store: string
  date: string
  currency: string
  total: number
  items: ScannedItem[]
}

interface Props {
  onClose: () => void
  onSuccess?: () => void
  bankAccounts: BankAccount[]
  categories: Category[]
}

type Step = 'camera' | 'scanning' | 'review' | 'saving' | 'done'

const SCOPE_LABELS = { personal: 'Personnel', common: 'Commun', shared: 'Partagé' }
const GRADIENT = 'linear-gradient(135deg, #e879f9, #818cf8)'

export default function ScanReceiptModal({ onClose, onSuccess, bankAccounts, categories }: Props) {
  const [step, setStep] = useState<Step>('camera')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<'personal' | 'common' | 'shared'>('personal')
  const [bankAccountId, setBankAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saveArticles, setSaveArticles] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const groceryCat = categories.find(c =>
    c.name.toLowerCase().includes('course') || c.name.toLowerCase().includes('grocery') || c.name.toLowerCase().includes('alimentation')
  )

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setStep('scanning')
    setError(null)

    const fd = new FormData()
    fd.append('image', file)

    try {
      const res = await fetch('/api/scan-receipt', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'analyse')
        setStep('camera')
        return
      }

      const items: ScannedItem[] = (data.items || []).map((item: Omit<ScannedItem, 'include'>) => ({
        ...item,
        include: true,
      }))
      setResult({ ...data, items })
      setCategoryId(groceryCat?.id || '')
      setStep('review')
    } catch {
      setError('Impossible de contacter l\'IA. Vérifiez votre connexion.')
      setStep('camera')
    }
  }, [groceryCat])

  function toggleItem(idx: number) {
    if (!result) return
    setResult(r => r ? {
      ...r,
      items: r.items.map((it, i) => i === idx ? { ...it, include: !it.include } : it),
    } : r)
  }

  function updateItem(idx: number, field: keyof ScannedItem, value: string | number | boolean) {
    if (!result) return
    setResult(r => r ? {
      ...r,
      items: r.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
    } : r)
  }

  function computedTotal() {
    if (!result) return 0
    return result.items
      .filter(it => it.include)
      .reduce((s, it) => s + it.unit_price * it.quantity, 0)
  }

  async function handleSubmit() {
    if (!result) return
    setStep('saving')

    const total = computedTotal()
    const txDate = result.date
      ? new Date(result.date + 'T12:00:00').toISOString()
      : new Date().toISOString()

    try {
      // 1. Create the main transaction
      await createTransaction({
        amount: total,
        description: result.store || 'Courses',
        type: 'expense',
        scope,
        category_id: categoryId || null,
        bank_account_id: bankAccountId || null,
        created_at: txDate,
      })

      // 2. Optionally upsert grocery articles + prices
      if (saveArticles) {
        const includedItems = result.items.filter(it => it.include)
        await Promise.allSettled(
          includedItems.map(async (item) => {
            // Upsert article
            const artRes = await fetch('/api/grocery-articles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: item.name, brand: item.brand, unit: item.unit }),
            })
            if (!artRes.ok) return

            const article = await artRes.json()

            // Record price for this store
            await fetch('/api/grocery-articles/prices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                article_id: article.id,
                store_name: result.store,
                price: item.unit_price,
              }),
            })
          })
        )
      }

      setStep('done')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch {
      setError('Erreur lors de la sauvegarde')
      setStep('review')
    }
  }

  function retake() {
    setStep('camera')
    setResult(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 border-b border-[#3f3f46]">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-[#27272a] text-[#a1a1aa]">
          <X size={20} />
        </button>
        <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
          <ScanLine size={16} className="text-[#e879f9]" />
          Scanner un reçu
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* STEP: camera */}
        {step === 'camera' && (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 gap-6">
            {preview && (
              <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-[#3f3f46]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Reçu" className="w-full object-contain max-h-48" />
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 w-full max-w-xs text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="text-center">
              <p className="text-[#a1a1aa] text-sm mb-1">Prenez en photo votre reçu</p>
              <p className="text-[#71717a] text-xs">L&apos;IA extraira automatiquement les articles et le montant</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapture}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-semibold text-base shadow-lg shadow-fuchsia-500/20"
              style={{ background: GRADIENT }}
            >
              <Camera size={20} />
              {error ? 'Réessayer' : 'Ouvrir la caméra'}
            </button>
          </div>
        )}

        {/* STEP: scanning */}
        {step === 'scanning' && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
            {preview && (
              <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-[#3f3f46] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Reçu" className="w-full object-contain max-h-48 opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-[#09090b]/80 rounded-full p-3">
                    <Loader2 size={28} className="text-[#e879f9] animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div className="text-center">
              <p className="text-[#fafafa] font-medium">Analyse en cours…</p>
              <p className="text-[#71717a] text-sm mt-1">Claude Vision lit votre reçu</p>
            </div>
          </div>
        )}

        {/* STEP: review */}
        {step === 'review' && result && (
          <div className="px-4 py-4 space-y-4">
            {/* Store / date */}
            <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#fafafa] font-semibold text-base">{result.store || 'Magasin inconnu'}</p>
                  <p className="text-[#71717a] text-xs mt-0.5">{result.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#e879f9] font-bold text-lg">
                    {computedTotal().toFixed(2)} {result.currency}
                  </p>
                  <button onClick={retake} className="text-[#71717a] text-xs underline">Refaire</button>
                </div>
              </div>
            </div>

            {/* Scope */}
            <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wide">Options</p>
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Portée</label>
                <div className="flex gap-2">
                  {(['personal', 'common', 'shared'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        scope === s ? 'text-white' : 'bg-[#27272a] text-[#a1a1aa]'
                      }`}
                      style={scope === s ? { background: GRADIENT } : {}}
                    >
                      {SCOPE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Catégorie</label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full bg-[#27272a] text-[#fafafa] text-sm rounded-xl px-3 py-2 border border-[#3f3f46] appearance-none pr-8"
                  >
                    <option value="">Aucune catégorie</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                </div>
              </div>

              {/* Bank account */}
              {bankAccounts.length > 0 && (
                <div>
                  <label className="text-xs text-[#71717a] block mb-1.5">Compte bancaire</label>
                  <div className="relative">
                    <select
                      value={bankAccountId}
                      onChange={e => setBankAccountId(e.target.value)}
                      className="w-full bg-[#27272a] text-[#fafafa] text-sm rounded-xl px-3 py-2 border border-[#3f3f46] appearance-none pr-8"
                    >
                      <option value="">Aucun compte</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Save articles toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-[#fafafa]">Enregistrer les articles dans la base</span>
                <div
                  onClick={() => setSaveArticles(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${saveArticles ? 'bg-[#e879f9]' : 'bg-[#3f3f46]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${saveArticles ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            </div>

            {/* Items */}
            <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl overflow-hidden">
              <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wide px-4 pt-3 pb-2">
                Articles ({result.items.filter(it => it.include).length}/{result.items.length})
              </p>
              <div className="divide-y divide-[#27272a]">
                {result.items.map((item, idx) => (
                  <div key={idx} className={`flex items-start gap-3 px-4 py-3 ${!item.include ? 'opacity-40' : ''}`}>
                    <button
                      onClick={() => toggleItem(idx)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        item.include ? 'border-[#e879f9] bg-[#e879f9]' : 'border-[#52525b]'
                      }`}
                    >
                      {item.include && <div className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <input
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="bg-transparent text-[#fafafa] text-sm font-medium w-full focus:outline-none"
                      />
                      {item.brand && (
                        <p className="text-[#71717a] text-xs">{item.brand}</p>
                      )}
                      <p className="text-[#71717a] text-xs">
                        qté: {item.quantity} × {item.unit_price.toFixed(2)} {result.currency}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[#fafafa] text-sm font-semibold">
                        {(item.quantity * item.unit_price).toFixed(2)}
                      </p>
                      <button
                        onClick={() => updateItem(idx, 'include', false)}
                        className="text-[#52525b] hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP: saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={36} className="text-[#e879f9] animate-spin" />
            <p className="text-[#fafafa] font-medium">Enregistrement…</p>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <CheckCircle size={48} className="text-[#22c55e]" />
            <p className="text-[#fafafa] font-semibold text-lg">Transaction créée !</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {step === 'review' && result && (
        <div className="px-4 pb-safe pb-6 pt-3 border-t border-[#3f3f46]">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-base shadow-lg shadow-fuchsia-500/20 flex items-center justify-center gap-2"
            style={{ background: GRADIENT }}
          >
            Confirmer — {computedTotal().toFixed(2)} {result.currency}
          </button>
        </div>
      )}
    </div>
  )
}
