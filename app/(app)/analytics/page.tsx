'use client'
import { useState, useMemo } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth, formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import MonthPicker from '@/components/ui/MonthPicker'

const MONTH_SHORT: Record<string, string> = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
}

interface AnalyticsData {
  months: number
  trend: { month: string; income: number; expenses: number; savings: number }[]
  totals: { income: number; expenses: number; savings: number; avg_savings_rate: number }
  best_month:  { month: string; income: number; expenses: number; savings: number }
  worst_month: { month: string; income: number; expenses: number; savings: number }
  category_breakdown: { name: string; icon: string; color: string; is_fixed: boolean; amount: number }[]
}

// ─── Courbe : revenus vs dépenses par mois ───────────────────────────────────
function LineChart({ trend }: { trend: AnalyticsData['trend'] }) {
  const TOP = 20; const H = 130; const BOT = 30
  const totalH = TOP + H + BOT
  const STEP = trend.length > 8 ? 32 : 48
  const PAD = 16
  const totalW = (trend.length - 1) * STEP + PAD * 2

  const maxVal = Math.max(...trend.map(t => Math.max(t.income, t.expenses)), 1)
  const toX = (i: number) => PAD + i * STEP
  const toY = (v: number) => TOP + H - (v / maxVal) * H

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const incPts  = trend.map((t, i) => ({ x: toX(i), y: toY(t.income),   v: t.income,   m: t.month }))
  const expPts  = trend.map((t, i) => ({ x: toX(i), y: toY(t.expenses), v: t.expenses, m: t.month }))

  const polyInc = incPts.map(p => `${p.x},${p.y}`).join(' ')
  const polyExp = expPts.map(p => `${p.x},${p.y}`).join(' ')

  // Zone remplie sous chaque courbe
  const areaInc = `M ${incPts[0].x},${TOP+H} ${incPts.map(p=>`L ${p.x},${p.y}`).join(' ')} L ${incPts[incPts.length-1].x},${TOP+H} Z`
  const areaExp = `M ${expPts[0].x},${TOP+H} ${expPts.map(p=>`L ${p.x},${p.y}`).join(' ')} L ${expPts[expPts.length-1].x},${TOP+H} Z`

  const fmt = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1).replace('.0','')}k` : `${Math.round(v)}`

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${totalW} ${totalH}`} className="min-w-[300px]">
        <defs>
          <linearGradient id="areaInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
          </linearGradient>
          <linearGradient id="areaExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02"/>
          </linearGradient>
        </defs>

        {/* Grille horizontale */}
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={PAD} y1={TOP + H - p*H} x2={totalW - PAD} y2={TOP + H - p*H}
            stroke="#27272a" strokeWidth="0.8" strokeDasharray="4,4" />
        ))}

        {/* Zones remplies */}
        <path d={areaExp} fill="url(#areaExp)" />
        <path d={areaInc} fill="url(#areaInc)" />

        {/* Courbe dépenses */}
        <polyline points={polyExp} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Courbe revenus */}
        <polyline points={polyInc} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Points + labels */}
        {trend.map((t, i) => {
          const isCur = t.month === currentMonth
          const xi = toX(i)
          const yi = toY(t.income)
          const ye = toY(t.expenses)
          return (
            <g key={t.month}>
              {/* Ligne verticale mois courant */}
              {isCur && (
                <line x1={xi} y1={TOP} x2={xi} y2={TOP+H} stroke="#ffffff18" strokeWidth="1.5" strokeDasharray="3,3" />
              )}
              {/* Point revenu */}
              <circle cx={xi} cy={yi} r={isCur ? 4 : 2.5} fill="#22c55e" stroke="#09090b" strokeWidth="1.5" />
              {/* Valeur revenu (mois courant seulement) */}
              {isCur && (
                <text x={xi} y={yi - 7} textAnchor="middle" fontSize="8" fill="#22c55e" fontWeight="bold">
                  {fmt(t.income)}
                </text>
              )}
              {/* Point dépense */}
              <circle cx={xi} cy={ye} r={isCur ? 4 : 2.5} fill="#ef4444" stroke="#09090b" strokeWidth="1.5" />
              {/* Valeur dépense (mois courant seulement) */}
              {isCur && (
                <text x={xi} y={ye - 7} textAnchor="middle" fontSize="8" fill="#ef4444" fontWeight="bold">
                  {fmt(t.expenses)}
                </text>
              )}
              {/* Label mois */}
              <text x={xi} y={TOP+H+14} textAnchor="middle" fontSize="8"
                fill={isCur ? '#fafafa' : '#52525b'} fontWeight={isCur ? 'bold' : 'normal'}>
                {MONTH_SHORT[t.month.split('-')[1]]}
              </text>
              <text x={xi} y={TOP+H+24} textAnchor="middle" fontSize="7" fill="#3f3f46">
                {t.month.split('-')[0].slice(2)}
              </text>
            </g>
          )
        })}

        {/* Ligne de base */}
        <line x1={PAD} y1={TOP+H} x2={totalW-PAD} y2={TOP+H} stroke="#3f3f46" strokeWidth="1" />
      </svg>

      <div className="flex items-center gap-5 justify-center mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
          <span className="w-6 h-0.5 bg-[#22c55e] inline-block rounded-full"/>Revenus
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
          <span className="w-6 h-0.5 bg-[#ef4444] inline-block rounded-full"/>Dépenses
        </span>
      </div>
    </div>
  )
}

// ─── Courbe : épargne dans le temps ──────────────────────────────────────────
function SavingsLineChart({ trend }: { trend: AnalyticsData['trend'] }) {
  const vals = trend.map(t => t.savings)
  const minVal = Math.min(...vals); const maxVal = Math.max(...vals)
  const range = maxVal - minVal || 1
  const H = 100; const STEP = trend.length > 8 ? 28 : 40; const totalW = (trend.length - 1) * STEP + 20
  const toY = (v: number) => H - 10 - ((v - minVal) / range) * (H - 20)
  const toX = (i: number) => i * STEP + 10
  const pts = trend.map((t, i) => ({ x: toX(i), y: toY(t.savings), v: t.savings, m: t.month }))
  const area = `M ${pts[0].x},${H} ${pts.map(p=>`L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length-1].x},${H} Z`

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${totalW+20} ${H+20}`} className="min-w-[260px]">
        {minVal < 0 && maxVal > 0 && (
          <line x1={0} y1={toY(0)} x2={totalW+20} y2={toY(0)} stroke="#3f3f46" strokeWidth="1" strokeDasharray="4,2" />
        )}
        <path d={area} fill="url(#sg)" opacity="0.25" />
        <polyline points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p,i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={p.v>=0?'#22c55e':'#ef4444'} stroke="#09090b" strokeWidth="1.5" />
        ))}
        {pts.map((p,i) => (
          <text key={i} x={p.x} y={H+14} textAnchor="middle" fontSize="8" fill="#52525b">
            {MONTH_SHORT[p.m.split('-')[1]]}
          </text>
        ))}
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#818cf800"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── Barres par jour : transactions du mois ───────────────────────────────────
function DailyChart({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const [year, mo] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mo, 0).getDate()

  const byDay = useMemo(() => {
    const map: Record<number, { income: number; expenses: number }> = {}
    for (let d = 1; d <= daysInMonth; d++) map[d] = { income: 0, expenses: 0 }
    transactions.forEach(tx => {
      const d = parseInt(tx.created_at.slice(8, 10))
      if (!map[d]) return
      if (tx.type === 'income') map[d].income += Number(tx.amount)
      else map[d].expenses += Number(tx.amount)
    })
    return map
  }, [transactions, daysInMonth])

  const maxVal = Math.max(...Object.values(byDay).map(d => Math.max(d.income, d.expenses)), 1)
  const H = 80; const barW = 5; const gap = 1; const spacing = 2
  const groupW = barW * 2 + gap
  const totalW = daysInMonth * (groupW + spacing)

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${totalW} ${H + 20}`} className="min-w-[340px]">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const d = byDay[day]
          const x = i * (groupW + spacing)
          const hIn  = (d.income   / maxVal) * H
          const hOut = (d.expenses / maxVal) * H
          const hasData = d.income > 0 || d.expenses > 0
          return (
            <g key={day}>
              <rect x={x}          y={H-hIn}  width={barW} height={hIn}  rx={1.5} fill={hasData ? '#22c55e' : '#22c55e22'} />
              <rect x={x+barW+gap} y={H-hOut} width={barW} height={hOut} rx={1.5} fill={hasData ? '#ef4444' : '#ef444422'} />
              {day % 5 === 0 && (
                <text x={x+groupW/2} y={H+13} textAnchor="middle" fontSize="7.5" fill="#52525b">{day}</text>
              )}
            </g>
          )
        })}
        <line x1={0} y1={H} x2={totalW} y2={H} stroke="#3f3f46" strokeWidth="1" />
      </svg>
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-[#52525b]">1er</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[10px] text-[#a1a1aa]"><span className="w-2 h-2 rounded-sm bg-[#22c55e] inline-block"/>Revenus</span>
          <span className="flex items-center gap-1 text-[10px] text-[#a1a1aa]"><span className="w-2 h-2 rounded-sm bg-[#ef4444] inline-block"/>Dépenses</span>
        </div>
        <span className="text-[10px] text-[#52525b]">{daysInMonth}</span>
      </div>
    </div>
  )
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────
function DonutChart({ slices }: { slices: AnalyticsData['category_breakdown'] }) {
  const total = slices.reduce((s, c) => s + c.amount, 0)
  if (total === 0) return <p className="text-sm text-[#71717a] text-center py-6">Aucune dépense</p>
  const R = 58; const cx = 75; const cy = 75; const sw = 22
  let cumul = -Math.PI / 2
  const arcs = slices.slice(0, 10).map(sl => {
    const angle = (sl.amount / total) * 2 * Math.PI
    const s = cumul; cumul += angle
    const x1=cx+R*Math.cos(s), y1=cy+R*Math.sin(s), x2=cx+R*Math.cos(cumul), y2=cy+R*Math.sin(cumul)
    return { ...sl, d:`M ${x1} ${y1} A ${R} ${R} 0 ${angle>Math.PI?1:0} 1 ${x2} ${y2}`, pct: Math.round((sl.amount/total)*100) }
  })
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="flex-shrink-0">
        <svg width="150" height="150" viewBox="0 0 150 150">
          {arcs.map((a,i) => <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="butt" />)}
          <text x={cx} y={cy-5} textAnchor="middle" fontSize="9" fill="#a1a1aa">Total</text>
          <text x={cx} y={cy+9} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fafafa">{formatCurrency(total)}</text>
        </svg>
      </div>
      <div className="flex-1 space-y-2 w-full min-w-0">
        {arcs.map((a,i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:a.color}}/>
            <span className="text-xs text-[#d4d4d8] truncate flex-1">{a.icon} {a.name}</span>
            <span className="text-[11px] text-[#71717a] flex-shrink-0">{a.pct}%</span>
            <span className="text-xs font-semibold text-[#fafafa] flex-shrink-0 w-20 text-right">{formatCurrency(a.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const PERIODS = [{ label:'3 mois', v:3 },{ label:'6 mois', v:6 },{ label:'12 mois', v:12 },{ label:'24 mois', v:24 }]

export default function AnalyticsPage() {
  const [months, setMonths] = useState(12)
  const [month,  setMonth ] = useState(() => formatMonth(new Date()))

  const { data, loading: aLoading } = useFetch<AnalyticsData>(`/api/analytics?months=${months}`)
  const { data: transactions, loading: tLoading } = useFetch<Transaction[]>(`/api/transactions?month=${month}`)

  const loading = aLoading || tLoading

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#fafafa]">Analytique</h1>
        <p className="text-xs text-[#a1a1aa] mt-0.5">Vue d&apos;ensemble dans le temps</p>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="h-36 bg-[#18181b] rounded-2xl animate-pulse" />)}</div>
      ) : !data ? null : (
        <>
          {/* ── Sélecteur de période ── */}
          <div className="flex items-center gap-1 bg-[#27272a] rounded-xl p-1 self-start">
            {PERIODS.map(p => (
              <button key={p.v} onClick={() => setMonths(p.v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${months===p.v ? 'bg-[#e879f9] text-white' : 'text-[#a1a1aa]'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* ── 4 cartes totaux ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'Revenus totaux',    val: data.totals.income,          color:'text-[#22c55e]' },
              { label:'Dépenses totales',  val: data.totals.expenses,        color:'text-[#ef4444]' },
              { label:'Épargne totale',    val: data.totals.savings,         color: data.totals.savings>=0 ? 'text-[#818cf8]' : 'text-[#ef4444]' },
              { label:'Taux épargne moy.', val: data.totals.avg_savings_rate, color: data.totals.avg_savings_rate>=20?'text-[#22c55e]':data.totals.avg_savings_rate>=10?'text-[#f59e0b]':'text-[#ef4444]', pct: true },
            ].map(c => (
              <div key={c.label} className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
                <p className="text-[11px] text-[#a1a1aa] mb-1">{c.label}</p>
                <p className={`text-base font-bold ${c.color}`}>{c.pct ? `${c.val}%` : formatCurrency(c.val)}</p>
                <p className="text-[10px] text-[#52525b] mt-0.5">sur {months} mois</p>
              </div>
            ))}
          </div>

          {/* ── Meilleur / Pire mois ── */}
          {data.trend.length > 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-2xl p-4">
                <p className="text-[11px] text-[#22c55e] mb-1">🏆 Meilleur mois</p>
                <p className="text-xs font-semibold text-[#fafafa]">
                  {MONTH_SHORT[data.best_month.month.split('-')[1]]} {data.best_month.month.split('-')[0]}
                </p>
                <p className="text-sm font-bold text-[#22c55e]">{formatCurrency(data.best_month.savings)} épargné</p>
              </div>
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl p-4">
                <p className="text-[11px] text-[#ef4444] mb-1">⚠️ Mois difficile</p>
                <p className="text-xs font-semibold text-[#fafafa]">
                  {MONTH_SHORT[data.worst_month.month.split('-')[1]]} {data.worst_month.month.split('-')[0]}
                </p>
                <p className="text-sm font-bold text-[#ef4444]">{formatCurrency(data.worst_month.savings)} épargné</p>
              </div>
            </div>
          )}

          {/* ── Graphique barres revenus vs dépenses ── */}
          <section className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
            <p className="text-sm font-semibold text-[#fafafa] mb-0.5">📊 Revenus vs Dépenses</p>
            <p className="text-[11px] text-[#71717a] mb-4">Évolution sur {months} mois</p>
            <LineChart trend={data.trend} />
          </section>

          {/* ── Courbe épargne + tableau ── */}
          <section className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
            <p className="text-sm font-semibold text-[#fafafa] mb-0.5">📈 Épargne mensuelle</p>
            <p className="text-[11px] text-[#71717a] mb-4">Revenus − Dépenses par mois</p>
            <SavingsLineChart trend={data.trend} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[11px] min-w-[300px]">
                <thead>
                  <tr className="text-[#52525b] border-b border-[#27272a]">
                    <th className="text-left pb-1.5 font-medium">Mois</th>
                    <th className="text-right pb-1.5 font-medium text-[#22c55e]">Revenus</th>
                    <th className="text-right pb-1.5 font-medium text-[#ef4444]">Dépenses</th>
                    <th className="text-right pb-1.5 font-medium text-[#818cf8]">Épargne</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.trend].reverse().map(t => (
                    <tr key={t.month} className="border-b border-[#27272a]/40">
                      <td className="py-1.5 text-[#a1a1aa]">{MONTH_SHORT[t.month.split('-')[1]]} {t.month.split('-')[0]}</td>
                      <td className="py-1.5 text-right text-[#22c55e]">{formatCurrency(t.income)}</td>
                      <td className="py-1.5 text-right text-[#ef4444]">{formatCurrency(t.expenses)}</td>
                      <td className={`py-1.5 text-right font-semibold ${t.savings>=0?'text-[#818cf8]':'text-[#ef4444]'}`}>{formatCurrency(t.savings)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#3f3f46]">
                    <td className="pt-2 text-[#71717a] font-semibold">Total</td>
                    <td className="pt-2 text-right text-[#22c55e] font-bold">{formatCurrency(data.totals.income)}</td>
                    <td className="pt-2 text-right text-[#ef4444] font-bold">{formatCurrency(data.totals.expenses)}</td>
                    <td className={`pt-2 text-right font-bold ${data.totals.savings>=0?'text-[#818cf8]':'text-[#ef4444]'}`}>{formatCurrency(data.totals.savings)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* ── Graphique transactions par jour du mois ── */}
          <section className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-semibold text-[#fafafa]">📅 Transactions par jour</p>
                <p className="text-[11px] text-[#71717a] mt-0.5">Revenus & dépenses chaque jour du mois</p>
              </div>
              <MonthPicker value={month} onChange={setMonth} />
            </div>
            <div className="mt-4">
              {transactions && transactions.length > 0
                ? <DailyChart transactions={transactions} month={month} />
                : <p className="text-sm text-[#71717a] text-center py-4">Aucune transaction ce mois</p>
              }
            </div>
            {transactions && transactions.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-[#27272a]">
                <div>
                  <p className="text-[10px] text-[#a1a1aa]">Total revenus du mois</p>
                  <p className="text-sm font-bold text-[#22c55e]">
                    {formatCurrency(transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#a1a1aa]">Total dépenses du mois</p>
                  <p className="text-sm font-bold text-[#ef4444]">
                    {formatCurrency(transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0))}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── Donut répartition des dépenses ── */}
          <section className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46]">
            <p className="text-sm font-semibold text-[#fafafa] mb-0.5">🍩 Répartition des dépenses</p>
            <p className="text-[11px] text-[#71717a] mb-4">Par catégorie sur {months} mois</p>
            <DonutChart slices={data.category_breakdown} />
          </section>
        </>
      )}
    </div>
  )
}
