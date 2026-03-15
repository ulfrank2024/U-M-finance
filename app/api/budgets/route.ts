import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/budgets
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/budgets — create or upsert by category_id
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { category_id, monthly_amount } = await request.json()
  if (!category_id || monthly_amount == null) {
    return NextResponse.json({ error: 'category_id et monthly_amount sont requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      {
        category_id,
        monthly_amount: parseFloat(monthly_amount),
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'category_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
