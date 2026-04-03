import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type Cat = { id: string; name: string; icon: string; color: string; is_fixed: boolean }
type Tx  = { amount: number; type: string; category_id: string | null; created_at: string; credit_card_id: string | null }
type CCPayment = { amount: number; payment_date: string }

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const months = Math.min(24, Math.max(3, parseInt(params.get('months') || '12')))

  const admin = createAdminClient()

  function monthBounds(m: string) {
    const [year, mo] = m.split('-').map(Number)
    return { start: `${m}-01`, end: new Date(year, mo, 0).toISOString().split('T')[0] }
  }

  const now = new Date()
  const monthList: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const globalStart = monthBounds(monthList[0]).start
  const globalEnd   = monthBounds(monthList[monthList.length - 1]).end

  const { data: allCatsRaw } = await admin.from('categories').select('id, name, icon, color, is_fixed')
  const allCats = (allCatsRaw || []) as Cat[]
  const catMap = new Map<string, Cat>(allCats.map(c => [c.id, c]))

  const { data: allTxsRaw } = await admin
    .from('transactions')
    .select('amount, type, category_id, created_at, credit_card_id')
    .gte('created_at', globalStart)
    .lte('created_at', globalEnd)
  const allTxs = (allTxsRaw || []) as Tx[]

  const { data: allCCRaw } = await admin
    .from('credit_card_payments')
    .select('amount, payment_date')
    .gte('payment_date', globalStart)
    .lte('payment_date', globalEnd)
  const allCCPayments = (allCCRaw || []) as CCPayment[]

  const trend = monthList.map(m => {
    const { start, end } = monthBounds(m)
    const txsOfMonth = allTxs.filter(t => t.created_at >= start && t.created_at <= end)
    const ccOfMonth  = allCCPayments.filter(p => p.payment_date >= start && p.payment_date <= end)
    const income   = txsOfMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = txsOfMonth.filter(t => t.type === 'expense' && !t.credit_card_id).reduce((s, t) => s + Number(t.amount), 0)
    const ccPaid   = ccOfMonth.reduce((s, p) => s + Number(p.amount), 0)
    const totalOut = expenses + ccPaid
    return { month: m, income, expenses: totalOut, savings: income - totalOut }
  })

  const totalIncome   = trend.reduce((s, t) => s + t.income, 0)
  const totalExpenses = trend.reduce((s, t) => s + t.expenses, 0)
  const totalSavings  = trend.reduce((s, t) => s + t.savings, 0)
  const avgSavingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0
  const bestMonth  = [...trend].sort((a, b) => b.savings - a.savings)[0]
  const worstMonth = [...trend].sort((a, b) => a.savings - b.savings)[0]

  const catTotals: Record<string, { name: string; icon: string; color: string; is_fixed: boolean; amount: number }> = {}
  for (const tx of allTxs) {
    if (tx.type !== 'expense' || tx.credit_card_id) continue
    const cid = tx.category_id || '__none__'
    const cat = tx.category_id ? catMap.get(tx.category_id) : undefined
    if (!catTotals[cid]) {
      catTotals[cid] = {
        name: cat?.name || 'Sans catégorie',
        icon: cat?.icon || '📁',
        color: cat?.color || '#6b7280',
        is_fixed: cat?.is_fixed || false,
        amount: 0,
      }
    }
    catTotals[cid].amount += Number(tx.amount)
  }

  const totalCC = allCCPayments.reduce((s, p) => s + Number(p.amount), 0)
  if (totalCC > 0) {
    catTotals['__cc__'] = { name: 'Remb. Cartes', icon: '💳', color: '#f97316', is_fixed: false, amount: totalCC }
  }

  return NextResponse.json({
    months,
    trend,
    totals: { income: totalIncome, expenses: totalExpenses, savings: totalSavings, avg_savings_rate: avgSavingsRate },
    best_month: bestMonth,
    worst_month: worstMonth,
    category_breakdown: Object.values(catTotals).sort((a, b) => b.amount - a.amount),
  })
}
