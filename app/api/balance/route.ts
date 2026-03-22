import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/balance?month=2026-03
// Vue mensuelle complète : revenus, dépenses, balance couple, cartes de crédit
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // '2026-03'

  const admin = createAdminClient()

  // Profils du couple = l'utilisateur courant + tous ceux qui ont au moins 1 transaction
  const { data: txUsers } = await admin
    .from('transactions')
    .select('user_id')

  const coupleIds = [...new Set([
    user.id,
    ...(txUsers || []).map((r: { user_id: string }) => r.user_id),
  ])]

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, email, avatar_color, avatar_url')
    .in('id', coupleIds)

  // Filtre de date
  let dateFilter: { start?: string; end?: string } = {}
  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateFilter = {
      start: `${month}-01`,
      end:   new Date(year, m, 0).toISOString().split('T')[0],
    }
  }

  // Dette cartes de crédit par propriétaire
  const { data: allCards } = await admin
    .from('credit_cards')
    .select('id, owner_id, is_shared, credit_limit, credit_card_payments(amount)')

  const { data: cardTxs } = await admin
    .from('transactions')
    .select('credit_card_id, amount')
    .not('credit_card_id', 'is', null)
    .eq('type', 'expense')

  const cardDebtByUser: Record<string, number> = {}
  for (const card of (allCards || [])) {
    const spent = (cardTxs || [])
      .filter((t: { credit_card_id: string }) => t.credit_card_id === card.id)
      .reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0)
    const paid = ((card.credit_card_payments || []) as { amount: number }[])
      .reduce((s, p) => s + Number(p.amount), 0)
    const balance = Math.max(0, spent - paid)
    if (card.is_shared) {
      // Dette partagée : répartie équitablement
      const half = balance / 2
      for (const p of (profiles || [])) {
        cardDebtByUser[p.id] = (cardDebtByUser[p.id] || 0) + half
      }
    } else if (card.owner_id) {
      cardDebtByUser[card.owner_id] = (cardDebtByUser[card.owner_id] || 0) + balance
    }
  }

  // Toutes les transactions de la période
  let txQuery = admin
    .from('transactions')
    .select('user_id, amount, type, scope, shared_group_id, credit_card_id, category_id')

  if (dateFilter.start) txQuery = txQuery.gte('created_at', dateFilter.start)
  if (dateFilter.end)   txQuery = txQuery.lte('created_at', dateFilter.end)

  const { data: transactions } = await txQuery

  // Calcule les totaux par utilisateur
  const totals: Record<string, { income: number; personal_expenses: number; common_expenses: number; shared_expenses: number }> = {}
  for (const p of (profiles || [])) {
    totals[p.id] = { income: 0, personal_expenses: 0, common_expenses: 0, shared_expenses: 0 }
  }

  for (const tx of (transactions || [])) {
    if (!totals[tx.user_id]) continue
    if (tx.type === 'income') {
      totals[tx.user_id].income += Number(tx.amount)
    } else {
      if      (tx.scope === 'personal') totals[tx.user_id].personal_expenses += Number(tx.amount)
      else if (tx.scope === 'common')   totals[tx.user_id].common_expenses   += Number(tx.amount)
      else if (tx.scope === 'shared')   totals[tx.user_id].shared_expenses   += Number(tx.amount)
    }
  }

  // Ajouter les remboursements CC du mois (sortie réelle du compte bancaire)
  let ccQuery = admin
    .from('credit_card_payments')
    .select('user_id, amount')
  if (dateFilter.start) ccQuery = ccQuery.gte('payment_date', dateFilter.start)
  if (dateFilter.end)   ccQuery = ccQuery.lte('payment_date', dateFilter.end)
  const { data: ccPayments } = await ccQuery
  for (const p of (ccPayments || [])) {
    if (!totals[p.user_id]) continue
    totals[p.user_id].personal_expenses += Number(p.amount)
  }

  const summary = (profiles || []).map((p: { id: string; display_name: string; email: string; avatar_color: string; avatar_url: string | null }) => {
    const t = totals[p.id] || { income: 0, personal_expenses: 0, common_expenses: 0, shared_expenses: 0 }
    const total_expenses = t.personal_expenses + t.common_expenses + t.shared_expenses
    return {
      user_id:          p.id,
      display_name:     p.display_name || p.email,
      avatar_color:     p.avatar_color,
      avatar_url:       p.avatar_url || null,
      card_debt:        cardDebtByUser[p.id] || 0,
      income:           t.income,
      personal_expenses:t.personal_expenses,
      common_expenses:  t.common_expenses,
      shared_expenses:  t.shared_expenses,
      total_expenses,
      net:              t.income - total_expenses,
    }
  })

  // Balance couple (basée uniquement sur les dépenses communes + partagées)
  // Les virements sont des échanges indépendants et n'affectent pas la balance
  let balanceMessage = null
  if (summary.length === 2) {
    const [p1, p2] = summary
    const p1_shared = p1.common_expenses + p1.shared_expenses
    const p2_shared = p2.common_expenses + p2.shared_expenses
    const diff = p1_shared - p2_shared

    if (Math.abs(diff) > 0.01) {
      const debtor   = diff < 0 ? p1 : p2
      const creditor = diff < 0 ? p2 : p1
      balanceMessage = {
        debtor:   debtor.display_name,
        creditor: creditor.display_name,
        amount:   Math.abs(diff) / 2,
      }
    }
  }

  // Total couple
  type SummaryItem = { income: number; total_expenses: number; net: number }
  const coupleTotal = summary.reduce(
    (acc: SummaryItem, p: SummaryItem) => ({
      income:         acc.income + p.income,
      total_expenses: acc.total_expenses + p.total_expenses,
      net:            acc.net + p.net,
    }),
    { income: 0, total_expenses: 0, net: 0 }
  )

  return NextResponse.json({ summary, balance: balanceMessage, couple_total: coupleTotal })
}
