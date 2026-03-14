import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7) // '2026-03'

  const admin = createAdminClient()

  // Helper pour les bornes d'un mois
  function monthBounds(m: string) {
    const [year, mo] = m.split('-').map(Number)
    return {
      start: `${m}-01`,
      end: new Date(year, mo, 0).toISOString().split('T')[0],
    }
  }

  const { start, end } = monthBounds(month)

  // 1. Transactions du mois avec catégories
  const { data: txs } = await admin
    .from('transactions')
    .select('amount, type, category_id, categories(id, name, icon, color, is_fixed)')
    .gte('created_at', start)
    .lte('created_at', end)

  // 2. Catégories is_fixed
  const { data: allCats } = await admin.from('categories').select('id, name, icon, color, is_fixed')

  const catMap = new Map<string, { name: string; icon: string; color: string; is_fixed: boolean }>(
    (allCats || []).map(c => [c.id, c])
  )

  // 3. Calcul income / dépenses
  let income = 0
  const expByCategory: Record<string, { name: string; icon: string; color: string; is_fixed: boolean; amount: number; category_id: string | null }> = {}

  for (const tx of (txs || [])) {
    if (tx.type === 'income') {
      income += Number(tx.amount)
    } else {
      const catId = tx.category_id || '__none__'
      const cat = tx.category_id ? catMap.get(tx.category_id) : undefined
      if (!expByCategory[catId]) {
        expByCategory[catId] = {
          category_id: tx.category_id,
          name: cat?.name || 'Sans catégorie',
          icon: cat?.icon || '📁',
          color: cat?.color || '#6b7280',
          is_fixed: cat?.is_fixed || false,
          amount: 0,
        }
      }
      expByCategory[catId].amount += Number(tx.amount)
    }
  }

  const fixed_breakdown = Object.values(expByCategory)
    .filter(c => c.is_fixed)
    .sort((a, b) => b.amount - a.amount)

  const variable_breakdown = Object.values(expByCategory)
    .filter(c => !c.is_fixed)
    .sort((a, b) => b.amount - a.amount)

  const fixed_expenses = fixed_breakdown.reduce((s, c) => s + c.amount, 0)
  const variable_expenses = variable_breakdown.reduce((s, c) => s + c.amount, 0)
  const savings = income - fixed_expenses - variable_expenses
  const savings_rate = income > 0 ? Math.round((savings / income) * 100) : 0

  // 4. Dette cartes de crédit (totale, non mensuelle)
  const { data: cardTxs } = await admin
    .from('transactions')
    .select('amount')
    .eq('type', 'expense')
    .not('credit_card_id', 'is', null)

  const { data: cardPayments } = await admin
    .from('credit_card_payments')
    .select('amount')

  const totalCardSpent = (cardTxs || []).reduce((s, t) => s + Number(t.amount), 0)
  const totalCardPaid = (cardPayments || []).reduce((s, p) => s + Number(p.amount), 0)
  const card_debt = Math.max(0, totalCardSpent - totalCardPaid)

  // 5. Tendance 6 derniers mois
  const trend: { month: string; income: number; expenses: number }[] = []
  const [y, m_num] = month.split('-').map(Number)
  for (let i = 5; i >= 0; i--) {
    let mo = m_num - i
    let yr = y
    while (mo <= 0) { mo += 12; yr -= 1 }
    const mm = `${yr}-${String(mo).padStart(2, '0')}`
    const { start: s, end: e } = monthBounds(mm)
    const { data: mtxs } = await admin
      .from('transactions')
      .select('amount, type')
      .gte('created_at', s)
      .lte('created_at', e)
    const mi = (mtxs || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const me = (mtxs || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    trend.push({ month: mm, income: mi, expenses: me })
  }

  return NextResponse.json({
    month, income, fixed_expenses, variable_expenses, savings, savings_rate,
    card_debt, fixed_breakdown, variable_breakdown, trend,
  })
}
