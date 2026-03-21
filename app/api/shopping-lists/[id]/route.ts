import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/shopping-lists/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch the main list
  const { data, error } = await admin
    .from('shopping_lists')
    .select(`
      *,
      categories(id, name, icon, color),
      shopping_items(
        *,
        added_by_profile:profiles!shopping_items_added_by_fkey(id, display_name, avatar_color)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })

  // Fetch sub-lists for this list (if it's a parent)
  const { data: subListsData } = await admin
    .from('shopping_lists')
    .select(`
      *,
      categories(id, name, icon, color),
      shopping_items(
        *,
        added_by_profile:profiles!shopping_items_added_by_fkey(id, display_name, avatar_color)
      )
    `)
    .eq('parent_id', id)
    .order('created_at', { ascending: true })

  const sub_lists = (subListsData || []).map((sl: Record<string, unknown> & { shopping_items?: { id: string; is_checked: boolean }[] }) => {
    const slItems = sl.shopping_items || []
    return {
      ...sl,
      items: sl.shopping_items,
      shopping_items: undefined,
      items_count: slItems.length,
      checked_count: slItems.filter((i: { is_checked: boolean }) => i.is_checked).length,
    }
  })

  // Build the response list
  const directItems = data.shopping_items || []
  const list = {
    ...data,
    items: data.shopping_items,
    shopping_items: undefined,
    items_count: sub_lists.length > 0
      ? sub_lists.reduce((acc: number, sl: { items_count: number }) => acc + sl.items_count, 0)
      : directItems.length,
    checked_count: sub_lists.length > 0
      ? sub_lists.reduce((acc: number, sl: { checked_count: number }) => acc + sl.checked_count, 0)
      : directItems.filter((i: { is_checked: boolean }) => i.is_checked).length,
    sub_lists,
  }

  return NextResponse.json(list)
}

// PUT /api/shopping-lists/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const allowed = ['name', 'store_name', 'category_id', 'planned_date', 'status', 'parent_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .update(updates)
    .eq('id', id)
    .select('*, categories(id, name, icon, color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/shopping-lists/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
