import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/credit-card-payments?month=YYYY-MM
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const month = new URL(request.url).searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const [year, mo] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, mo, 0).toISOString().split('T')[0]

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('credit_card_payments')
    .select(`
      id, amount, payment_date, note, user_id, credit_card_id,
      credit_cards(id, name, last_four),
      profiles!credit_card_payments_user_id_fkey(id, display_name, avatar_color, avatar_url),
      bank_accounts(id, name, color)
    `)
    .gte('payment_date', start)
    .lte('payment_date', end)
    .order('payment_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}
