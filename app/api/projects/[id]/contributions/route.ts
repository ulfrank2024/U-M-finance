import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects/:id/contributions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('project_contributions')
    .select(`*, profiles!project_contributions_user_id_fkey(id, display_name, avatar_color)`)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/projects/:id/contributions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const { amount, note } = await request.json()

  if (!amount) return NextResponse.json({ error: 'Le montant est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('project_contributions')
    .insert({
      project_id: id,
      user_id:    user.id,
      amount:     parseFloat(amount),
      note,
    })
    .select(`*, profiles!project_contributions_user_id_fkey(id, display_name, avatar_color)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
