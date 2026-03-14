import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/credit-cards?mine=true  → seulement mes cartes + partagées
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const mine = new URL(request.url).searchParams.get('mine') === 'true'

  let q = supabase
    .from('credit_cards')
    .select(`
      *,
      owner:profiles!credit_cards_owner_id_fkey(id, display_name, avatar_color),
      credit_card_payments(id, amount, user_id, payment_date,
        profiles!credit_card_payments_user_id_fkey(id, display_name, avatar_color)
      )
    `)
    .order('created_at', { ascending: false })

  if (mine) {
    q = q.or(`owner_id.eq.${user.id},is_shared.eq.true`)
  }

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calcule le solde utilisé par carte (somme des dépenses liées)
  const cardsWithBalance = await Promise.all(
    (data || []).map(async (card) => {
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('credit_card_id', card.id)
        .eq('type', 'expense')

      const txSpent    = (txs || []).reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0)
      const totalSpent = txSpent + Number(card.opening_balance || 0)
      const totalPaid  = (card.credit_card_payments || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)

      return { ...card, total_spent: totalSpent, total_paid: totalPaid, current_balance: totalSpent - totalPaid }
    })
  )

  return NextResponse.json(cardsWithBalance)
}

// POST /api/credit-cards
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, last_four, credit_limit, opening_balance, due_date, is_shared, owner_id } = await request.json()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      name, last_four, credit_limit,
      opening_balance: opening_balance || 0,
      due_date,
      is_shared:  is_shared || false,
      owner_id:   is_shared ? null : (owner_id || user.id),
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
