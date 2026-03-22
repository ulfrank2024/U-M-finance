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

  const { to_user, amount, note, transfer_date, from_account_id, to_account_id } = await request.json()
  if (!to_user) return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

  const admin = createAdminClient()
  const txDate = transfer_date
    ? new Date(transfer_date + 'T12:00:00').toISOString()
    : new Date().toISOString()

  // Récupérer les noms des profils pour les descriptions
  const [{ data: fromProfile }, { data: toProfile }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', user.id).single(),
    admin.from('profiles').select('display_name').eq('id', to_user).single(),
  ])

  const fromName = (fromProfile as { display_name: string | null } | null)?.display_name || 'Moi'
  const toName = (toProfile as { display_name: string | null } | null)?.display_name || 'Partenaire'
  const noteLabel = note ? ` — ${note}` : ''

  // Transaction dépense pour l'envoyeur
  const { data: txFrom } = await admin.from('transactions').insert({
    user_id: user.id,
    amount,
    description: `💸 Virement → ${toName}${noteLabel}`,
    type: 'expense',
    scope: 'personal',
    bank_account_id: from_account_id || null,
    created_at: txDate,
    updated_by: user.id,
  }).select('id').single()

  // Transaction revenu pour le receveur
  const { data: txTo } = await admin.from('transactions').insert({
    user_id: to_user,
    amount,
    description: `💸 Virement ← ${fromName}${noteLabel}`,
    type: 'income',
    scope: 'personal',
    bank_account_id: to_account_id || null,
    created_at: txDate,
    updated_by: user.id,
  }).select('id').single()

  // Sauvegarder le virement avec les IDs des transactions liées
  const { data, error } = await supabase
    .from('transfers')
    .insert({
      from_user: user.id,
      to_user,
      amount,
      note: note || null,
      transfer_date: transfer_date || new Date().toISOString().split('T')[0],
      tx_from_id: (txFrom as { id: string } | null)?.id || null,
      tx_to_id:   (txTo   as { id: string } | null)?.id || null,
    })
    .select('*, from_profile:profiles!transfers_from_user_fkey(id, display_name, avatar_color, avatar_url), to_profile:profiles!transfers_to_user_fkey(id, display_name, avatar_color, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
