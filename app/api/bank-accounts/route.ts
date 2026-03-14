import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bank-accounts?mine=true  → seulement mes comptes + partagés
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const mine = new URL(request.url).searchParams.get('mine') === 'true'

  let q = supabase
    .from('bank_accounts')
    .select(`*, owner:profiles!bank_accounts_owner_id_fkey(id, display_name, avatar_color, avatar_url)`)
    .order('created_at', { ascending: true })

  if (mine) {
    // Mes comptes (owner = moi) OU sans propriétaire OU partagés
    q = q.or(`owner_id.eq.${user.id},owner_id.is.null,is_shared.eq.true`)
  }

  const { data: accounts, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calcule le solde de chaque compte
  const accountsWithBalance = await Promise.all(
    (accounts || []).map(async (account) => {
      const { data: incomeTxs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('bank_account_id', account.id)
        .eq('type', 'income')

      const { data: expenseTxs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('bank_account_id', account.id)
        .eq('type', 'expense')

      // Paiements de carte de crédit prélevés sur ce compte
      const { data: cardPayments } = await supabase
        .from('credit_card_payments')
        .select('amount')
        .eq('bank_account_id', account.id)

      const total_income        = (incomeTxs || []).reduce((s, t) => s + Number(t.amount), 0)
      const total_expenses      = (expenseTxs || []).reduce((s, t) => s + Number(t.amount), 0)
      const total_card_payments = (cardPayments || []).reduce((s, p) => s + Number(p.amount), 0)

      return {
        ...account,
        total_income,
        total_expenses: total_expenses + total_card_payments,
        balance: total_income - total_expenses - total_card_payments,
      }
    })
  )

  return NextResponse.json(accountsWithBalance)
}

// POST /api/bank-accounts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, color, is_shared, owner_id } = await request.json()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      name,
      color: color || '#6366f1',
      is_shared: is_shared || false,
      owner_id: is_shared ? null : (owner_id || user.id),
      updated_by: user.id,
    })
    .select(`*, owner:profiles!bank_accounts_owner_id_fkey(id, display_name, avatar_color, avatar_url)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, total_income: 0, total_expenses: 0, balance: 0 }, { status: 201 })
}
