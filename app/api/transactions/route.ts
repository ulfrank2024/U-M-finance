import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/transactions
// Params: type, scope, month, shared_group_id, credit_card_id
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type            = searchParams.get('type')
  const scope           = searchParams.get('scope')
  const month           = searchParams.get('month') // '2026-03'
  const sharedGroupId   = searchParams.get('shared_group_id')
  const creditCardId    = searchParams.get('credit_card_id')

  let query = supabase
    .from('transactions')
    .select(`
      *,
      categories(id, name, icon, color),
      profiles!transactions_user_id_fkey(id, display_name, avatar_color),
      updated_by_profile:profiles!transactions_updated_by_fkey(id, display_name, avatar_color),
      shared_groups(id, name),
      credit_cards(id, name, last_four)
    `)
    .order('created_at', { ascending: false })

  if (type)           query = query.eq('type', type)
  if (scope)          query = query.eq('scope', scope)
  if (sharedGroupId)  query = query.eq('shared_group_id', sharedGroupId)
  if (creditCardId)   query = query.eq('credit_card_id', creditCardId)

  if (month) {
    const [year, m] = month.split('-').map(Number)
    const start = `${month}-01`
    const end   = new Date(year, m, 0).toISOString().split('T')[0]
    query = query.gte('created_at', start).lte('created_at', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/transactions
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { amount, description, category_id, type, scope, shared_group_id, credit_card_id, exchange_rate, foreign_amount, foreign_currency, created_at } = body

  if (!amount || !type || !['income', 'expense'].includes(type)) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  if (scope && !['personal', 'common', 'shared'].includes(scope)) {
    return NextResponse.json({ error: 'Scope invalide' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      amount: parseFloat(amount),
      description:      description || null,
      category_id:      category_id || null,
      type,
      scope:            scope || 'personal',
      shared_group_id:  shared_group_id || null,
      credit_card_id:   credit_card_id || null,
      ...(exchange_rate    != null ? { exchange_rate }    : {}),
      ...(foreign_amount   != null ? { foreign_amount }   : {}),
      ...(foreign_currency != null ? { foreign_currency } : {}),
      user_id:          user.id,
      updated_by:       user.id,
      created_at:       created_at || new Date().toISOString(),
    })
    .select(`
      *,
      categories(id, name, icon, color),
      profiles!transactions_user_id_fkey(id, display_name, avatar_color),
      updated_by_profile:profiles!transactions_updated_by_fkey(id, display_name, avatar_color),
      shared_groups(id, name),
      credit_cards(id, name, last_four)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
