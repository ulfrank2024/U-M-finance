'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatCurrency } from '@/lib/utils'
import type { ReportData, ReportCardDetail, ReportIncomeTx, Budget } from '@/lib/types'
import MonthPicker from '@/components/ui/MonthPicker'
import Avatar from '@/components/ui/Avatar'

const MONTH_SHORT: Record<string, string> = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
}

function Delta({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev
  if (prev === 0 && current === 0) return null
  const sign = diff >= 0 ? '+' : ''
  const color = diff >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
  return (
    <p className={`text-[10px] mt-0.5 ${color}`}>
      {sign}{formatCurrency(diff)} vs mois préc.
    </p>
  )
}

export default function ReportPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))
  const { data, loading } = useFetch<ReportData>(`/api/report?month=${month}`)
  const { data: budgets } = useFetch<Budget[]>('/api/budgets')

  const maxTrendVal = data ? Math.max(...data.trend.map(t => Math.max(t.income, t.expenses)), 1) : 1
  const budgetMap = new Map<string, number>((budgets || []).map(b => [b.category_id, b.monthly_amount]))

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
                {data.prev_month && <Delta current={data.income} prev={data.prev_month.income} />}
              </div>
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Charges fixes</p>
                <p className="text-lg font-bold text-[#f97316]">{formatCurrency(data.fixed_expenses)}</p>
                {data.prev_month && <Delta current={data.fixed_expenses} prev={data.prev_month.fixed_expenses} />}
              </div>
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Charges variables</p>
                <p className="text-lg font-bold text-[#ef4444]">{formatCurrency(data.variable_expenses)}</p>
                {data.prev_month && <Delta current={data.variable_expenses} prev={data.prev_month.variable_expenses} />}
              </div>
              {data.card_payments_total > 0 && (
                <div>
                  <p className="text-[11px] text-[#a1a1aa]">Remb. cartes</p>
                  <p className="text-lg font-bold text-[#f97316]">{formatCurrency(data.card_payments_total)}</p>
                  {data.prev_month && <Delta current={data.card_payments_total} prev={data.prev_month.card_payments_total ?? 0} />}
                </div>
              )}
              <div>
                <p className="text-[11px] text-[#a1a1aa]">Épargne</p>
                <p className={`text-lg font-bold ${data.savings >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {formatCurrency(data.savings)}
                </p>
                {data.prev_month && <Delta current={data.savings} prev={data.prev_month.savings} />}
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

          {/* Entrées du mois */}
          {(data.income_transactions || []).length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[#fafafa]">💰 Entrées du mois</h2>
                <span className="text-sm font-bold text-[#22c55e]">{formatCurrency(data.income)}</span>
              </div>
              <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                {data.income_transactions.map((tx: ReportIncomeTx, i: number) => (
                  <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i < data.income_transactions.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                    {/* Icône catégorie */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: tx.category ? `${tx.category.color}25` : '#27272a' }}>
                      {tx.category?.icon || '💰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#fafafa] truncate">{tx.description || tx.category?.name || 'Revenu'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tx.profile && (
                          <div className="flex items-center gap-1">
                            <Avatar
                              displayName={tx.profile.display_name}
                              color={tx.profile.avatar_color}
                              avatarUrl={tx.profile.avatar_url}
                              size="xs"
                            />
                            <span className="text-[10px] text-[#71717a]">{tx.profile.display_name}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-[#71717a]">
                          {new Date(tx.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#22c55e] flex-shrink-0">{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                {data.fixed_breakdown.map((c, i) => {
                  const budget = c.category_id ? budgetMap.get(c.category_id) : undefined
                  const pct = budget && budget > 0 ? Math.min(100, (c.amount / budget) * 100) : null
                  const isOver = budget != null && c.amount > budget
                  const barColor = isOver ? '#ef4444' : pct != null && pct > 70 ? '#f97316' : '#22c55e'
                  return (
                    <div key={i} className={`px-4 py-3 ${i < data.fixed_breakdown.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: `${c.color}25` }}>
                          {c.icon}
                        </div>
                        <span className="flex-1 text-sm text-[#d4d4d8]">{c.name}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#f97316]">{formatCurrency(c.amount)}</span>
                          {budget && <span className="text-[10px] text-[#71717a] ml-1">/ {formatCurrency(budget)}</span>}
                          {isOver && <span className="ml-1 text-[10px] text-[#ef4444] font-semibold">⚠️ Dépassé</span>}
                        </div>
                      </div>
                      {pct !== null && (
                        <div className="mt-1.5 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                        </div>
                      )}
                    </div>
                  )
                })}
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
                  const budget = c.category_id ? budgetMap.get(c.category_id) : undefined
                  const budgetPct = budget && budget > 0 ? Math.min(100, (c.amount / budget) * 100) : null
                  const isOver = budget != null && c.amount > budget
                  const budgetBarColor = isOver ? '#ef4444' : budgetPct != null && budgetPct > 70 ? '#f97316' : '#22c55e'
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
                          {budget
                            ? <span className="text-[10px] text-[#71717a] ml-1">{formatCurrency(c.amount)} / {formatCurrency(budget)}</span>
                            : <span className="text-[10px] text-[#71717a] ml-1">{Math.round(pct)}%</span>
                          }
                          {isOver && <span className="ml-1 text-[10px] text-[#ef4444] font-semibold">⚠️ Dépassé</span>}
                        </div>
                      </div>
                      {budgetPct !== null ? (
                        <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, backgroundColor: budgetBarColor }} />
                        </div>
                      ) : (
                        <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Remboursements cartes de crédit ce mois */}
          {data.card_payments_total > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[#fafafa]">💳 Remboursements CC ce mois</h2>
                <span className="text-sm font-bold text-[#f97316]">{formatCurrency(data.card_payments_total)}</span>
              </div>
              <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                {data.payments_detail.map((p, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < data.payments_detail.length - 1 ? 'border-b border-[#27272a]' : ''}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-[#f97316]/15">
                      💳
                    </div>
                    <span className="flex-1 text-sm text-[#d4d4d8] truncate">
                      {p.name}{p.last_four ? ` ••${p.last_four}` : ''}
                    </span>
                    <span className="text-sm font-semibold text-[#f97316] flex-shrink-0">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#71717a] mt-1.5 px-1">
                Sorties réelles du compte bancaire ce mois-ci
              </p>
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
                          <p className="text-[10px] text-[#a1a1aa] mb-0.5">Dépensé (cumul)</p>
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

          {/* Tendance 6 mois — graphique SVG */}
          <section>
            <h2 className="text-sm font-semibold text-[#fafafa] mb-3">📈 Tendance 6 mois</h2>
            <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46] overflow-x-auto">
              {(() => {
                const H = 160
                const barW = 22
                const gap = 5
                const groupW = barW * 2 + gap
                const spacing = 20
                const totalW = data.trend.length * (groupW + spacing) - spacing + 10
                const isCurrentMonth = (m: string) => m === month

                return (
                  <svg width="100%" viewBox={`0 0 ${totalW} ${H + 50}`} className="min-w-[280px]">
                    {/* Lignes de grille horizontales */}
                    {[0.25, 0.5, 0.75, 1].map(pct => (
                      <g key={pct}>
                        <line
                          x1={0} y1={H - pct * H} x2={totalW} y2={H - pct * H}
                          stroke="#27272a" strokeWidth="1" strokeDasharray="4,4"
                        />
                        <text x={0} y={H - pct * H - 2} fontSize="7" fill="#3f3f46">
                          {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(maxTrendVal * pct)}
                        </text>
                      </g>
                    ))}

                    {data.trend.map((t, i) => {
                      const x = i * (groupW + spacing)
                      const hIn  = maxTrendVal > 0 ? (t.income   / maxTrendVal) * H : 0
                      const hOut = maxTrendVal > 0 ? (t.expenses / maxTrendVal) * H : 0
                      const isCur = isCurrentMonth(t.month)
                      const fmt = (v: number) =>
                        v >= 1000
                          ? `${(v / 1000).toFixed(1).replace('.0', '')}k`
                          : `${Math.round(v)}$`

                      return (
                        <g key={t.month}>
                          {/* Barre revenus avec dégradé */}
                          <defs>
                            <linearGradient id={`gin${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isCur ? '#22c55e' : '#22c55e'} stopOpacity={isCur ? '1' : '0.45'} />
                              <stop offset="100%" stopColor={isCur ? '#16a34a' : '#22c55e'} stopOpacity={isCur ? '0.7' : '0.2'} />
                            </linearGradient>
                            <linearGradient id={`gout${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isCur ? '#ef4444' : '#ef4444'} stopOpacity={isCur ? '1' : '0.45'} />
                              <stop offset="100%" stopColor={isCur ? '#dc2626' : '#ef4444'} stopOpacity={isCur ? '0.7' : '0.2'} />
                            </linearGradient>
                          </defs>

                          {/* Fond surbrillance mois courant */}
                          {isCur && (
                            <rect x={x - 3} y={0} width={groupW + 6} height={H}
                              rx={4} fill="#ffffff08" />
                          )}

                          {/* Barre revenus */}
                          <rect x={x} y={H - hIn} width={barW} height={hIn}
                            rx={4} fill={`url(#gin${i})`} />
                          {/* Valeur revenu au-dessus */}
                          {hIn > 0 && (
                            <text x={x + barW / 2} y={H - hIn - 4}
                              textAnchor="middle" fontSize="8"
                              fill={isCur ? '#22c55e' : '#4ade80'} fontWeight={isCur ? 'bold' : 'normal'}>
                              {fmt(t.income)}
                            </text>
                          )}

                          {/* Barre dépenses */}
                          <rect x={x + barW + gap} y={H - hOut} width={barW} height={hOut}
                            rx={4} fill={`url(#gout${i})`} />
                          {/* Valeur dépenses au-dessus */}
                          {hOut > 0 && (
                            <text x={x + barW + gap + barW / 2} y={H - hOut - 4}
                              textAnchor="middle" fontSize="8"
                              fill={isCur ? '#ef4444' : '#f87171'} fontWeight={isCur ? 'bold' : 'normal'}>
                              {fmt(t.expenses)}
                            </text>
                          )}

                          {/* Label mois */}
                          <text x={x + groupW / 2} y={H + 14}
                            textAnchor="middle" fontSize="9"
                            fill={isCur ? '#fafafa' : '#71717a'}
                            fontWeight={isCur ? 'bold' : 'normal'}>
                            {MONTH_SHORT[t.month.split('-')[1]] || t.month.split('-')[1]}
                          </text>

                          {/* Net (épargne) sous le mois */}
                          {(() => {
                            const net = t.income - t.expenses
                            return (
                              <text x={x + groupW / 2} y={H + 26}
                                textAnchor="middle" fontSize="7.5"
                                fill={net >= 0 ? '#22c55e' : '#ef4444'}>
                                {net >= 0 ? '+' : ''}{fmt(net)}
                              </text>
                            )
                          })()}
                        </g>
                      )
                    })}

                    {/* Ligne de base */}
                    <line x1={0} y1={H} x2={totalW} y2={H} stroke="#3f3f46" strokeWidth="1.5" />
                  </svg>
                )
              })()}

              {/* Légende */}
              <div className="flex items-center gap-5 justify-center mt-3 pt-3 border-t border-[#27272a]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                  <span className="text-[11px] text-[#a1a1aa]">Revenus</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
                  <span className="text-[11px] text-[#a1a1aa]">Dépenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to right, #22c55e, #ef4444)' }} />
                  <span className="text-[11px] text-[#a1a1aa]">Net sous le mois</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
