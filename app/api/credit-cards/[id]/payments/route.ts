import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/credit-cards/:id/payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('credit_card_payments')
    .select(`*, profiles!credit_card_payments_user_id_fkey(id, display_name, avatar_color)`)
    .eq('credit_card_id', id)
    .order('payment_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/credit-cards/:id/payments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const { amount, note, payment_date } = await request.json()

  if (!amount) return NextResponse.json({ error: 'Le montant est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('credit_card_payments')
    .insert({
      credit_card_id: id,
      user_id: user.id,
      amount: parseFloat(amount),
      note,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
    })
    .select(`*, profiles!credit_card_payments_user_id_fkey(id, display_name, avatar_color)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
