import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/transactions/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const { amount, description, category_id, type, scope, shared_group_id, credit_card_id, created_at } = await request.json()

  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount, description, category_id, type, scope,
      shared_group_id, credit_card_id, created_at,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('user_id', user.id)
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
  if (!data) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/transactions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
