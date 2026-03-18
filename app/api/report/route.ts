import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const admin = createAdminClient()

  function monthBounds(m: string) {
    const [year, mo] = m.split('-').map(Number)
    return {
      start: `${m}-01`,
      end: new Date(year, mo, 0).toISOString().split('T')[0],
    }
  }

  const { start, end } = monthBounds(month)

  // 1. Transactions du mois avec catégories + profil
  const { data: txs } = await admin
    .from('transactions')
    .select('id, amount, type, description, created_at, category_id, user_id, categories(id, name, icon, color, is_fixed), profiles!transactions_user_id_fkey(id, display_name, avatar_color, avatar_url)')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })

  // 2. Catégories is_fixed
  const { data: allCats } = await admin.from('categories').select('id, name, icon, color, is_fixed')

  const catMap = new Map<string, { name: string; icon: string; color: string; is_fixed: boolean }>(
    (allCats || []).map((c: { id: string; name: string; icon: string; color: string; is_fixed: boolean }) => [c.id, c])
  )

  // 3. Calcul income / dépenses
  let income = 0
  const income_transactions: {
    id: string; amount: number; description: string | null; created_at: string
    category: { name: string; icon: string; color: string } | null
    profile: { display_name: string; avatar_color: string; avatar_url: string | null } | null
  }[] = []
  const expByCategory: Record<string, { name: string; icon: string; color: string; is_fixed: boolean; amount: number; category_id: string | null }> = {}

  for (const tx of (txs || [])) {
    if (tx.type === 'income') {
      income += Number(tx.amount)
      const cat = tx.category_id ? catMap.get(tx.category_id) : undefined
      const prof = tx.profiles as { display_name: string; avatar_color: string; avatar_url: string | null } | null
      income_transactions.push({
        id: tx.id,
        amount: Number(tx.amount),
        description: tx.description ?? null,
        created_at: tx.created_at,
        category: cat ? { name: cat.name, icon: cat.icon, color: cat.color } : null,
        profile: prof ?? null,
      })
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

  // Paiements de carte de crédit effectués CE mois-ci
  const { data: monthPayments } = await admin
    .from('credit_card_payments')
    .select('amount, credit_card_id, credit_cards(id, name, last_four)')
    .gte('payment_date', start)
    .lte('payment_date', end)

  const paymentsByCard = new Map<string, { name: string; last_four: string | null; total: number }>()
  for (const p of (monthPayments || [])) {
    const card = p.credit_cards as { id: string; name: string; last_four: string | null } | null
    const key = card?.id || p.credit_card_id
    const label = card?.name || 'Carte'
    if (!paymentsByCard.has(key)) paymentsByCard.set(key, { name: label, last_four: card?.last_four ?? null, total: 0 })
    paymentsByCard.get(key)!.total += Number(p.amount)
  }
  const payments_detail = [...paymentsByCard.values()]
  const card_payments_total = payments_detail.reduce((s, p) => s + p.total, 0)

  const savings = income - fixed_expenses - variable_expenses
  const savings_rate = income > 0 ? Math.round((savings / income) * 100) : 0

  // 4. Cartes de crédit — détail par carte
  const { data: allCards } = await admin
    .from('credit_cards')
    .select('id, name, last_four, credit_limit, opening_balance, is_shared, owner_id, owner:profiles!credit_cards_owner_id_fkey(id, display_name, avatar_color)')
    .order('created_at', { ascending: true })

  const { data: allCardTxs } = await admin
    .from('transactions')
    .select('credit_card_id, amount')
    .eq('type', 'expense')
    .not('credit_card_id', 'is', null)

  const { data: allCardPayments } = await admin
    .from('credit_card_payments')
    .select('credit_card_id, amount, payment_date')

  const cards_detail = (allCards || []).map((card: {
    id: string; name: string; last_four: string | null; credit_limit: number | null
    opening_balance: number | null; is_shared: boolean; owner_id: string | null
    owner: { id: string; display_name: string; avatar_color: string } | null
  }) => {
    const cardTxsForCard = (allCardTxs || []).filter((t: { credit_card_id: string }) => t.credit_card_id === card.id)
    const totalSpent = cardTxsForCard.reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0)
      + Number(card.opening_balance || 0)

    const allPaymentsForCard = (allCardPayments || []).filter((p: { credit_card_id: string }) => p.credit_card_id === card.id)
    const totalPaid = allPaymentsForCard.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

    // Paiements effectués CE mois-ci
    const monthPayments = allPaymentsForCard.filter((p: { payment_date: string }) =>
      p.payment_date >= start && p.payment_date <= end
    )
    const paid_this_month = monthPayments.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

    const current_balance = Math.max(0, totalSpent - totalPaid)

    return {
      id: card.id,
      name: card.name,
      last_four: card.last_four,
      credit_limit: card.credit_limit,
      is_shared: card.is_shared,
      owner: card.owner,
      total_spent: totalSpent,
      total_paid: totalPaid,
      current_balance,
      paid_this_month,
    }
  })

  const card_debt = cards_detail.reduce((s: number, c: { current_balance: number }) => s + c.current_balance, 0)

  // 4b. Mois précédent
  const [currY, currM] = month.split('-').map(Number)
  let prevM = currM - 1
  let prevY = currY
  if (prevM <= 0) { prevM += 12; prevY -= 1 }
  const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`
  const { start: prevStart, end: prevEnd } = monthBounds(prevMonthStr)
  const { data: prevTxs } = await admin
    .from('transactions')
    .select('amount, type, category_id')
    .gte('created_at', prevStart)
    .lte('created_at', prevEnd)

  let prev_income = 0
  let prev_fixed = 0
  let prev_variable = 0
  for (const tx of (prevTxs || [])) {
    if (tx.type === 'income') {
      prev_income += Number(tx.amount)
    } else {
      const cat = tx.category_id ? catMap.get(tx.category_id) : undefined
      if (cat?.is_fixed) {
        prev_fixed += Number(tx.amount)
      } else {
        prev_variable += Number(tx.amount)
      }
    }
  }
  const { data: prevPayments } = await admin
    .from('credit_card_payments')
    .select('amount')
    .gte('payment_date', prevStart)
    .lte('payment_date', prevEnd)
  const prev_card_payments = (prevPayments || []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)
  const prev_savings = prev_income - prev_fixed - prev_variable
  const prev_month = { income: prev_income, fixed_expenses: prev_fixed, variable_expenses: prev_variable, card_payments_total: prev_card_payments, savings: prev_savings }

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
    const mi = (mtxs || []).filter((t: { type: string; amount: number }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0)
    const me = (mtxs || []).filter((t: { type: string; amount: number }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0)
    trend.push({ month: mm, income: mi, expenses: me })
  }

  return NextResponse.json({
    month, income, fixed_expenses, variable_expenses, card_payments_total, payments_detail,
    savings, savings_rate,
    card_debt, cards_detail, fixed_breakdown, variable_breakdown, trend, income_transactions,
    prev_month,
  })
}
