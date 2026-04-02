'use client'
import { useState, useMemo } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatCurrency } from '@/lib/utils'
import type { Transaction, ReportData } from '@/lib/types'
import MonthPicker from '@/components/ui/MonthPicker'
import Avatar from '@/components/ui/Avatar'

const MONTH_SHORT: Record<string, string> = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
}

// ─── Graphique barres SVG (6 mois) ───────────────────────────────────────────
function BarChart({ trend }: { trend: { month: string; income: number; expenses: number }[] }) {
  const maxVal = Math.max(...trend.map(t => Math.max(t.income, t.expenses)), 1)
  const H = 120
  const barW = 18
  const gap = 4
  const groupW = barW * 2 + gap
  const spacing = 12
  const totalW = trend.length * (groupW + spacing)

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${totalW} ${H + 28}`} className="min-w-[280px]">
        {trend.map((t, i) => {
          const x = i * (groupW + spacing)
          const hIncome  = (t.income   / maxVal) * H
          const hExpense = (t.expenses / maxVal) * H
          const isLast   = i === trend.length - 1
          return (
            <g key={t.month}>
              {/* Barre revenus */}
              <rect
                x={x} y={H - hIncome} width={barW} height={hIncome}
                rx={3} fill={isLast ? '#22c55e' : '#22c55e55'}
              />
              {/* Valeur revenu (si dernière barre) */}
              {isLast && hIncome > 15 && (
                <text x={x + barW / 2} y={H - hIncome - 3} textAnchor="middle" fontSize="7" fill="#22c55e">
                  {formatCurrency(t.income).replace('CA', '').replace('$', '$')}
                </text>
              )}
              {/* Barre dépenses */}
              <rect
                x={x + barW + gap} y={H - hExpense} width={barW} height={hExpense}
                rx={3} fill={isLast ? '#ef4444' : '#ef444455'}
              />
              {/* Mois label */}
              <text x={x + groupW / 2} y={H + 14} textAnchor="middle" fontSize="9" fill={isLast ? '#fafafa' : '#71717a'}>
                {MONTH_SHORT[t.month.split('-')[1]] || t.month.split('-')[1]}
              </text>
            </g>
          )
        })}
        {/* Ligne 0 */}
        <line x1={0} y1={H} x2={totalW} y2={H} stroke="#3f3f46" strokeWidth="1" />
      </svg>

      <div className="flex items-center gap-5 justify-center mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          <span className="text-[11px] text-[#a1a1aa]">Revenus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
          <span className="text-[11px] text-[#a1a1aa]">Dépenses</span>
        </div>
      </div>
    </div>
  )
}

// ─── Graphique donut SVG ──────────────────────────────────────────────────────
function DonutChart({ slices }: { slices: { name: string; icon: string; color: string; amount: number }[] }) {
  const total = slices.reduce((s, c) => s + c.amount, 0)
  if (total === 0) return <p className="text-sm text-[#71717a] text-center py-6">Aucune dépense ce mois</p>

  const R = 60
  const cx = 80
  const cy = 80
  const stroke = 24

  let cumulAngle = -Math.PI / 2
  const arcs = slices.map(sl => {
    const angle = (sl.amount / total) * 2 * Math.PI
    const start = cumulAngle
    const end = cumulAngle + angle
    cumulAngle = end

    const x1 = cx + R * Math.cos(start)
    const y1 = cy + R * Math.sin(start)
    const x2 = cx + R * Math.cos(end)
    const y2 = cy + R * Math.sin(end)
    const large = angle > Math.PI ? 1 : 0

    return { ...sl, d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`, pct: Math.round((sl.amount / total) * 100) }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* SVG */}
      <div className="flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {arcs.map((arc, i) => (
            <path
              key={i}
              d={arc.d}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            />
          ))}
          {/* Centre */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="#a1a1aa">Total</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fafafa">
            {formatCurrency(total)}
          </text>
        </svg>
      </div>

      {/* Légende */}
      <div className="flex-1 space-y-2 w-full">
        {arcs.slice(0, 8).map((arc, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
            <span className="text-xs text-[#d4d4d8] truncate flex-1">{arc.icon} {arc.name}</span>
            <span className="text-xs font-semibold text-[#fafafa] flex-shrink-0">{arc.pct}%</span>
            <span className="text-xs text-[#71717a] flex-shrink-0 w-20 text-right">{formatCurrency(arc.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))

  const { data: report, loading: rLoading } = useFetch<ReportData>(`/api/report?month=${month}`)
  const { data: transactions, loading: tLoading } = useFetch<Transaction[]>(`/api/transactions?month=${month}`)

  const loading = rLoading || tLoading

  // Dépenses par catégorie pour le donut
  const categorySlices = useMemo(() => {
    if (!report) return []
    return [...report.fixed_breakdown, ...report.variable_breakdown]
      .sort((a, b) => b.amount - a.amount)
  }, [report])

  // Transactions groupées par jour
  const byDay = useMemo(() => {
    if (!transactions) return []
    const map = new Map<string, Transaction[]>()
    transactions.forEach(tx => {
      const day = tx.created_at.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(tx)
    })
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [transactions])

  const net = report ? report.income - report.fixed_expenses - report.variable_expenses : 0

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa]">Analytique</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Revenus & dépenses du mois</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* ── Résumé 4 cartes ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
              <p className="text-[11px] text-[#a1a1aa] mb-1">Revenus</p>
              <p className="text-lg font-bold text-[#22c55e]">{formatCurrency(report?.income ?? 0)}</p>
            </div>
            <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
              <p className="text-[11px] text-[#a1a1aa] mb-1">Dépenses</p>
              <p className="text-lg font-bold text-[#ef4444]">
                {formatCurrency((report?.fixed_expenses ?? 0) + (report?.variable_expenses ?? 0))}
              </p>
            </div>
            <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
              <p className="text-[11px] text-[#a1a1aa] mb-1">Net</p>
              <p className={`text-lg font-bold ${net >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {formatCurrency(net)}
              </p>
            </div>
            <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
              <p className="text-[11px] text-[#a1a1aa] mb-1">Taux épargne</p>
              <p className={`text-lg font-bold ${(report?.savings_rate ?? 0) >= 20 ? 'text-[#22c55e]' : (report?.savings_rate ?? 0) >= 10 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                {report?.savings_rate ?? 0}%
              </p>
            </div>
          </div>

          {/* ── Graphique barres 6 mois ── */}
          {report && report.trend.length > 0 && (
            <section className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
              <p className="text-sm font-semibold text-[#fafafa] mb-4">📈 Tendance 6 mois</p>
              <BarChart trend={report.trend} />
            </section>
          )}

          {/* ── Graphique donut ── */}
          <section className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
            <p className="text-sm font-semibold text-[#fafafa] mb-4">🍩 Répartition des dépenses</p>
            <DonutChart slices={categorySlices} />
          </section>

          {/* ── Liste complète par jour ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#fafafa]">
                📋 Toutes les transactions
                {transactions && <span className="ml-1.5 text-xs font-normal text-[#71717a]">({transactions.length})</span>}
              </p>
            </div>

            {byDay.length === 0 ? (
              <div className="bg-[#18181b] rounded-2xl p-6 border border-[#3f3f46] text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm text-[#a1a1aa]">Aucune transaction ce mois</p>
              </div>
            ) : (
              <div className="space-y-4">
                {byDay.map(([day, txs]) => {
                  const dayIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
                  const dayExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
                  const dayLabel = new Date(day + 'T12:00:00').toLocaleDateString('fr-CA', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })

                  return (
                    <div key={day}>
                      {/* En-tête du jour */}
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <p className="text-xs font-medium text-[#a1a1aa] capitalize">{dayLabel}</p>
                        <div className="flex items-center gap-2 text-[11px]">
                          {dayIncome > 0 && <span className="text-[#22c55e]">+{formatCurrency(dayIncome)}</span>}
                          {dayExpenses > 0 && <span className="text-[#ef4444]">-{formatCurrency(dayExpenses)}</span>}
                        </div>
                      </div>

                      {/* Transactions du jour */}
                      <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
                        {txs.map((tx, i) => {
                          const isIncome = tx.type === 'income'
                          return (
                            <div
                              key={tx.id}
                              className={`flex items-center gap-3 px-4 py-3 ${i < txs.length - 1 ? 'border-b border-[#27272a]' : ''}`}
                            >
                              {/* Icône catégorie */}
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                                style={{ backgroundColor: tx.categories?.color ? `${tx.categories.color}25` : '#27272a' }}
                              >
                                {tx.categories?.icon || (isIncome ? '💰' : '📁')}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#fafafa] truncate">
                                  {tx.description || tx.categories?.name || (isIncome ? 'Revenu' : 'Dépense')}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {tx.categories?.name && (
                                    <span className="text-[10px] text-[#71717a]">{tx.categories.name}</span>
                                  )}
                                  {tx.profiles && (
                                    <div className="flex items-center gap-1">
                                      <Avatar
                                        displayName={tx.profiles.display_name}
                                        color={tx.profiles.avatar_color}
                                        avatarUrl={tx.profiles.avatar_url}
                                        size="xs"
                                      />
                                    </div>
                                  )}
                                  {tx.credit_cards && (
                                    <span className="text-[10px] text-[#71717a]">💳 {tx.credit_cards.name}</span>
                                  )}
                                  {tx.bank_accounts && (
                                    <span className="text-[10px] text-[#71717a]">🏦 {tx.bank_accounts.name}</span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                    tx.categories?.is_fixed
                                      ? 'bg-[#f97316]/15 text-[#f97316]'
                                      : 'bg-[#27272a] text-[#71717a]'
                                  }`}>
                                    {tx.categories?.is_fixed ? 'Fixe' : isIncome ? 'Revenu' : 'Variable'}
                                  </span>
                                </div>
                              </div>

                              {/* Montant */}
                              <span className={`text-sm font-semibold flex-shrink-0 ${isIncome ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
