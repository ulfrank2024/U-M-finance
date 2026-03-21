import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/shopping-lists
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch all lists (root + sub) with their items to compute counts
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

  const allLists = (data || []) as Array<Record<string, unknown> & {
    id: string
    parent_id: string | null
    status: string
    created_at: string
    shopping_items: { id: string; is_checked: boolean }[]
  }>

  // Build a map of direct items count per list
  const directCounts = new Map<string, { items: number; checked: number }>()
  for (const list of allLists) {
    const items = list.shopping_items || []
    directCounts.set(list.id, {
      items: items.length,
      checked: items.filter((i) => i.is_checked).length,
    })
  }

  // For root lists, aggregate counts across all sub-lists (children)
  // Build parent->children map
  const childrenOf = new Map<string, string[]>()
  for (const list of allLists) {
    if (list.parent_id) {
      const arr = childrenOf.get(list.parent_id) || []
      arr.push(list.id)
      childrenOf.set(list.parent_id, arr)
    }
  }

  function aggregateCounts(listId: string): { items: number; checked: number } {
    const children = childrenOf.get(listId)
    if (!children || children.length === 0) {
      return directCounts.get(listId) || { items: 0, checked: 0 }
    }
    // Has sub-lists: aggregate from children
    let items = 0
    let checked = 0
    for (const childId of children) {
      const c = aggregateCounts(childId)
      items += c.items
      checked += c.checked
    }
    return { items, checked }
  }

  // Only return root lists (parent_id IS NULL)
  const rootLists = allLists
    .filter((l) => !l.parent_id)
    .map((list) => {
      const counts = aggregateCounts(list.id)
      return {
        ...list,
        shopping_items: undefined,
        items_count: counts.items,
        checked_count: counts.checked,
      }
    })

  // Sort: open and shopping first, done last
  rootLists.sort((a: { status: string; created_at: string }, b: { status: string; created_at: string }) => {
    const order = { open: 0, shopping: 1, done: 2 }
    const aOrder = order[a.status as keyof typeof order] ?? 3
    const bOrder = order[b.status as keyof typeof order] ?? 3
    if (aOrder !== bOrder) return aOrder - bOrder
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return NextResponse.json(rootLists)
}

// POST /api/shopping-lists
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, store_name, category_id, planned_date, parent_id } = await request.json()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      name,
      store_name: store_name || null,
      category_id: category_id || null,
      planned_date: planned_date || null,
      parent_id: parent_id || null,
      created_by: user.id,
    })
    .select('*, categories(id, name, icon, color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, items_count: 0, checked_count: 0 }, { status: 201 })
}
