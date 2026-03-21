import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/shopping-lists/[id]/duplicate
// Body: { parent_id: string }
// Clones the list (name, category, date) + all its items (unchecked) into a new parent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { parent_id } = await request.json()
  if (!parent_id) return NextResponse.json({ error: 'parent_id requis' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch original list
  const { data: original, error: origError } = await admin
    .from('shopping_lists')
    .select('name, category_id, planned_date, shopping_items(name, quantity)')
    .eq('id', id)
    .single()

  if (origError || !original) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })

  // Create the new list
  const { data: newList, error: createError } = await supabase
    .from('shopping_lists')
    .insert({
      name: original.name,
      category_id: original.category_id || null,
      planned_date: original.planned_date || null,
      parent_id,
      status: 'open',
      created_by: user.id,
    })
    .select('*, categories(id, name, icon, color)')
    .single()

  if (createError || !newList) return NextResponse.json({ error: createError?.message || 'Erreur création' }, { status: 500 })

  // Copy items (all unchecked)
  const items = (original.shopping_items || []) as { name: string; quantity: string | null }[]
  if (items.length > 0) {
    await admin.from('shopping_items').insert(
      items.map(item => ({
        list_id: newList.id,
        name: item.name,
        quantity: item.quantity || null,
        is_checked: false,
        added_by: user.id,
      }))
    )
  }

  return NextResponse.json({ ...newList, items_count: items.length, checked_count: 0 }, { status: 201 })
}
