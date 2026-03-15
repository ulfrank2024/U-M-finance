import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/transactions/generate-recurring
// body: { month: 'YYYY-MM' }
// Creates missing recurring transactions for the given month
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { month } = await request.json()
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Mois invalide (format YYYY-MM requis)' }, { status: 400 })
  }

  const [year, monthNum] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

  // Fetch all recurring transactions for this user (templates)
  const { data: templates, error: tplError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_recurring', true)

  if (tplError) return NextResponse.json({ error: tplError.message }, { status: 500 })
  if (!templates || templates.length === 0) {
    return NextResponse.json({ created: 0, transactions: [] })
  }

  // Fetch existing transactions for this month to avoid duplicates
  const { data: existing } = await supabase
    .from('transactions')
    .select('description, category_id, type')
    .eq('user_id', user.id)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')

  const existingKeys = new Set(
    (existing || []).map(t => `${t.description}|${t.category_id}|${t.type}`)
  )

  const toCreate = templates.filter(t => {
    const key = `${t.description}|${t.category_id}|${t.type}`
    return !existingKeys.has(key)
  })

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0, transactions: [] })
  }

  const inserts = toCreate.map(t => {
    const day = t.recurring_day || 1
    const clampedDay = Math.min(day, lastDay)
    const txDate = `${month}-${String(clampedDay).padStart(2, '0')}`
    return {
      user_id: user.id,
      amount: t.amount,
      description: t.description,
      category_id: t.category_id,
      type: t.type,
      scope: t.scope,
      credit_card_id: t.credit_card_id,
      bank_account_id: t.bank_account_id,
      is_recurring: false, // copies ne sont pas des templates
      created_at: txDate + 'T12:00:00',
      updated_by: user.id,
    }
  })

  const { data: created, error: insertError } = await supabase
    .from('transactions')
    .insert(inserts)
    .select()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ created: created?.length || 0, transactions: created || [] })
}
