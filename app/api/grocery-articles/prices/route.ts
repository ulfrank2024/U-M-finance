import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/grocery-articles/prices
// Body: { article_id, store_name, price }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { article_id, store_name, price } = await request.json()

  if (!article_id || !store_name || price == null) {
    return NextResponse.json({ error: 'article_id, store_name et price sont requis' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('article_store_prices')
    .insert({ article_id, store_name, price: Number(price) })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
