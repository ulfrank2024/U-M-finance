import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/bank-accounts/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const { name, color, is_shared, owner_id } = await request.json()

  const { data, error } = await supabase
    .from('bank_accounts')
    .update({ name, color, is_shared, owner_id, updated_by: user.id })
    .eq('id', id)
    .select(`*, owner:profiles!bank_accounts_owner_id_fkey(id, display_name, avatar_color, avatar_url)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/bank-accounts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
