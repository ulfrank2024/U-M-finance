import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/credit-cards/:id  — seulement le propriétaire peut modifier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  // Vérifier la propriété
  const { data: existing } = await supabase.from('credit_cards').select('owner_id, is_shared').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
  if (!existing.is_shared && existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { name, last_four, credit_limit, opening_balance, due_date, is_shared, owner_id } = await request.json()

  const { data, error } = await supabase
    .from('credit_cards')
    .update({ name, last_four, credit_limit, opening_balance, due_date, is_shared, owner_id, updated_by: user.id })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/credit-cards/:id  — seulement le propriétaire peut supprimer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  // Vérifier la propriété
  const { data: existing } = await supabase.from('credit_cards').select('owner_id, is_shared').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
  if (!existing.is_shared && existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabase.from('credit_cards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
