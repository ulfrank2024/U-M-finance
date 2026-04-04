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
    .limit(q ? 15 : 500)

  if (q.length >= 1) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const articles = (data as ArticleRow[] || []).map(a => {
    const prices = (a.article_store_prices || []) as StorePrice[]

    // Deduplicate: latest price per store
    const latestByStore = new Map<string, number>()
    for (const p of [...prices].sort((x, y) => y.recorded_at.localeCompare(x.recorded_at))) {
      if (!latestByStore.has(p.store_name)) latestByStore.set(p.store_name, Number(p.price))
    }
    const store_prices = Array.from(latestByStore.entries()).map(([s, price]) => ({ store: s, price }))

    let best_price: number | null = null
    if (store) {
      best_price = latestByStore.get(store) ?? latestByStore.get(
        [...latestByStore.keys()].find(k => k.toLowerCase() === store.toLowerCase()) ?? ''
      ) ?? null
    }
    if (best_price === null && store_prices.length > 0) best_price = store_prices[0].price

    return {
      id: a.id,
      name: a.name,
      brand: a.brand,
      unit: a.unit,
      best_price,
      store_prices,
      stores: store_prices.map(sp => sp.store),
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
