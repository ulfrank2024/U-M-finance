import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type StorePrice = { store_name: string; price: number; recorded_at: string }
type ArticleRow = { id: string; name: string; brand: string; unit: string; article_store_prices: StorePrice[] }

// GET /api/grocery-articles?q=lait&store=Super+C
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const params = new URL(request.url).searchParams
  const q = params.get('q') || ''
  const store = params.get('store') || ''

  let query = admin
    .from('grocery_articles')
    .select('id, name, brand, unit, article_store_prices(store_name, price, recorded_at)')
    .order('name')
    .limit(15)

  if (q.length >= 1) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const articles = (data as ArticleRow[] || []).map(a => {
    const prices = (a.article_store_prices || []) as StorePrice[]
    let best_price: number | null = null

    if (store) {
      const sp = prices
        .filter(p => p.store_name.toLowerCase() === store.toLowerCase())
        .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      if (sp.length > 0) best_price = Number(sp[0].price)
    }

    if (best_price === null && prices.length > 0) {
      const latest = [...prices].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      best_price = Number(latest[0].price)
      // Annotate with store name for display
    }

    const storeNames = [...new Set(prices.map(p => p.store_name))]

    return {
      id: a.id,
      name: a.name,
      brand: a.brand,
      unit: a.unit,
      best_price,
      stores: storeNames,
    }
  })

  return NextResponse.json(articles)
}

// POST /api/grocery-articles
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const body = await request.json()
  const { name, brand = '', unit = 'unité' } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const { data, error } = await admin
    .from('grocery_articles')
    .upsert({ name: name.trim(), brand: brand.trim(), unit: unit.trim() }, { onConflict: 'name,brand' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
