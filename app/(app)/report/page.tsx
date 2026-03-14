'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatCurrency } from '@/lib/utils'
import type { ReportData, ReportCardDetail } from '@/lib/types'
import MonthPicker from '@/components/ui/MonthPicker'
import Avatar from '@/components/ui/Avatar'

const MONTH_SHORT: Record<string, string> = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
}

export default function ReportPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))
  const { data, loading } = useFetch<ReportData>(`/api/report?month=${month}`)

  const maxTrendVal = data ? Math.max(...data.trend.map(t => Math.max(t.income, t.expenses)), 1) : 1

  return (
    <div className="px-4 pt-6 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa]">Rapport mensuel</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Analyse de vos finances</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : !data ? null : (
        <>
          {/* Résumé */}
          <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46] space-y-3">
            <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Résumé</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Revenus</p>
                <p className="text-lg font-bold text-[#22c55e]">{formatCurrency(data.income)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Charges fixes</p>
                <p className="text-lg font-bold text-[#f97316]">{formatCurrency(data.fixed_expenses)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Charges variables</p>
                <p className="text-lg font-bold text-[#ef4444]">{formatCurrency(data.variable_expenses)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Épargne</p>
                <p className={`text-lg font-bold ${data.savings >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {formatCurrency(data.savings)}
                </p>
              </div>
            </div>
            {/* Taux d'épargne */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a1a1aa]">Taux d&apos;épargne</span>
                <span className={`font-semibold ${data.savings_rate >= 20 ? 'text-[#22c55e]' : data.savings_rate >= 10 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                  {data.savings_rate}%
                </span>
              </div>
              <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, data.savings_rate))}%`,
                    background: data.savings_rate >= 20 ? '#22c55e' : data.savings_rate >= 10 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Charges fixes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#fafafa]">📌 Charges fixes</h2>
              <span className="text-sm font-bold text-[#f97316]">{formatCurrency(data.fixed_expenses)}</span>
            </div>
            {data.fixed_breakdown.length === 0 ? (
              <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46] text-center">
                <p className="text-sm text-[#a1a1aa]">Aucune charge fixe ce mois</p>
                <Link href="/categories" className="text-xs text-[#e879f9] mt-1 block">
                  Taguez vos catégories récurrentes →
                </Link>
              </div>
            ) : (
              <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                {data.fixed_breakdown.map((c, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < data.fixed_breakdown.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${c.color}25` }}>
                      {c.icon}
                    </div>
                    <span className="flex-1 text-sm text-[#d4d4d8]">{c.name}</span>
                    <span className="text-sm font-semibold text-[#f97316]">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Charges variables */}
          {data.variable_breakdown.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[#fafafa]">📊 Charges variables</h2>
                <span className="text-sm font-bold text-[#ef4444]">{formatCurrency(data.variable_expenses)}</span>
              </div>
              <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                {data.variable_breakdown.map((c, i) => {
                  const pct = data.variable_expenses > 0 ? (c.amount / data.variable_expenses) * 100 : 0
                  return (
                    <div key={i} className={`px-4 py-3 ${i < data.variable_breakdown.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                          style={{ backgroundColor: `${c.color}25` }}>
                          {c.icon}
                        </div>
                        <span className="flex-1 text-sm text-[#d4d4d8]">{c.name}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#ef4444]">{formatCurrency(c.amount)}</span>
                          <span className="text-[10px] text-[#71717a] ml-1">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Cartes de crédit — détail */}
          {(data.cards_detail || []).length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[#fafafa]">💳 Cartes de crédit</h2>
                <Link href="/credit-cards" className="text-xs text-[#e879f9]">Gérer →</Link>
              </div>
              <div className="space-y-3">
                {data.cards_detail.map((card: ReportCardDetail) => {
                  const pct = card.credit_limit && card.credit_limit > 0
                    ? Math.min(100, (card.current_balance / card.credit_limit) * 100)
                    : null
                  const isOverLimit = card.credit_limit != null && card.current_balance > card.credit_limit
                  return (
                    <div key={card.id} className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46] space-y-3">
                      {/* En-tête carte */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💳</span>
                          <div>
                            <p className="text-sm font-semibold text-[#fafafa]">
                              {card.name}{card.last_four ? ` ••${card.last_four}` : ''}
                            </p>
                            {card.owner && !card.is_shared && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Avatar displayName={card.owner.display_name} color={card.owner.avatar_color} size="xs" />
                                <span className="text-[11px] text-[#a1a1aa]">{card.owner.display_name}</span>
                              </div>
                            )}
                            {card.is_shared && <span className="text-[11px] text-[#818cf8]">💑 Commune</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${card.current_balance > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                            {formatCurrency(card.current_balance)}
                          </p>
                          <p className="text-[11px] text-[#71717a]">solde dû</p>
                        </div>
                      </div>

                      {/* Barre utilisation limite */}
                      {pct !== null && (
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[#a1a1aa]">Utilisation</span>
                            <span className={isOverLimit ? 'text-[#ef4444] font-semibold' : 'text-[#a1a1aa]'}>
                              {Math.round(pct)}% {isOverLimit && '⚠️ Limite dépassée'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct > 90 ? '#ef4444' : pct > 70 ? '#f97316' : '#22c55e',
                              }}
                            />
                          </div>
                          {card.credit_limit && (
                            <p className="text-[10px] text-[#71717a] mt-0.5">
                              Limite : {formatCurrency(card.credit_limit)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Ligne dépenses vs remboursements */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a]">
                        <div className="text-center">
                          <p className="text-[10px] text-[#a1a1aa] mb-0.5">Total dépensé</p>
                          <p className="text-xs font-semibold text-[#ef4444]">{formatCurrency(card.total_spent)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#a1a1aa] mb-0.5">Remb. ce mois</p>
                          <p className={`text-xs font-semibold ${card.paid_this_month > 0 ? 'text-[#22c55e]' : 'text-[#71717a]'}`}>
                            {card.paid_this_month > 0 ? formatCurrency(card.paid_this_month) : '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#a1a1aa] mb-0.5">Total remb.</p>
                          <p className="text-xs font-semibold text-[#22c55e]">{formatCurrency(card.total_paid)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Total global */}
                {data.card_debt > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-[#ef4444]/10 rounded-2xl border border-[#ef4444]/30">
                    <span className="text-sm text-[#fafafa] font-medium">Total dû (toutes cartes)</span>
                    <span className="text-lg font-bold text-[#ef4444]">{formatCurrency(data.card_debt)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tendance 6 mois */}
          <section>
            <h2 className="text-sm font-semibold text-[#fafafa] mb-3">📈 Tendance 6 mois</h2>
            <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
              <div className="flex items-end justify-between gap-2 h-28 mb-2">
                {data.trend.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: '80px' }}>
                      {/* Barre revenus */}
                      <div
                        className="w-[45%] rounded-t-sm bg-[#22c55e]/70"
                        style={{ height: `${(t.income / maxTrendVal) * 80}px` }}
                      />
                      {/* Barre dépenses */}
                      <div
                        className="w-[45%] rounded-t-sm bg-[#ef4444]/70"
                        style={{ height: `${(t.expenses / maxTrendVal) * 80}px` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#71717a]">
                      {MONTH_SHORT[t.month.split('-')[1]] || t.month.split('-')[1]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 justify-center pt-2 border-t border-[#27272a]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#22c55e]/70" />
                  <span className="text-[11px] text-[#a1a1aa]">Revenus</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#ef4444]/70" />
                  <span className="text-[11px] text-[#a1a1aa]">Dépenses</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
