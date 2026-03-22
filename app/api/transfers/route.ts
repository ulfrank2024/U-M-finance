import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/transfers?month=2026-03
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')

  let query = admin
    .from('transfers')
    .select('*, from_profile:profiles!transfers_from_user_fkey(id, display_name, avatar_color, avatar_url), to_profile:profiles!transfers_to_user_fkey(id, display_name, avatar_color, avatar_url)')
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (month) {
    const [year, m] = month.split('-').map(Number)
    const start = `${month}-01`
    const end = new Date(year, m, 0).toISOString().split('T')[0]
    query = query.gte('transfer_date', start).lte('transfer_date', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/transfers
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { to_user, amount, note, transfer_date } = await request.json()
  if (!to_user) return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

  const { data, error } = await supabase
    .from('transfers')
    .insert({
      from_user: user.id,
      to_user,
      amount,
      note: note || null,
      transfer_date: transfer_date || new Date().toISOString().split('T')[0],
    })
    .select('*, from_profile:profiles!transfers_from_user_fkey(id, display_name, avatar_color, avatar_url), to_profile:profiles!transfers_to_user_fkey(id, display_name, avatar_color, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
