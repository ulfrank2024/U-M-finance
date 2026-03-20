import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/shopping-lists
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shopping_lists')
    .select(`
      *,
      categories(id, name, icon, color),
      shopping_items(id, is_checked)
    `)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute items_count and checked_count, sort open/shopping before done
  const lists = (data || []).map((list: Record<string, unknown>) => {
    const items = (list.shopping_items as { id: string; is_checked: boolean }[]) || []
    return {
      ...list,
      shopping_items: undefined,
      items_count: items.length,
      checked_count: items.filter((i) => i.is_checked).length,
    }
  })

  // Sort: open and shopping first, done last
  lists.sort((a: { status: string; created_at: string }, b: { status: string; created_at: string }) => {
    const order = { open: 0, shopping: 1, done: 2 }
    const aOrder = order[a.status as keyof typeof order] ?? 3
    const bOrder = order[b.status as keyof typeof order] ?? 3
    if (aOrder !== bOrder) return aOrder - bOrder
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return NextResponse.json(lists)
}

// POST /api/shopping-lists
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, store_name, category_id, planned_date } = await request.json()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      name,
      store_name: store_name || null,
      category_id: category_id || null,
      planned_date: planned_date || null,
      created_by: user.id,
    })
    .select('*, categories(id, name, icon, color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, items_count: 0, checked_count: 0 }, { status: 201 })
}
