import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/shopping-lists/[id]/items/[itemId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if ('name' in body) updates.name = body.name
  if ('quantity' in body) updates.quantity = body.quantity
  if ('estimated_price' in body) updates.estimated_price = body.estimated_price
  if ('actual_price' in body) updates.actual_price = body.actual_price

  if ('is_checked' in body) {
    updates.is_checked = body.is_checked
    if (body.is_checked === true) {
      updates.checked_by = user.id
      updates.checked_at = new Date().toISOString()
    } else {
      updates.checked_by = null
      updates.checked_at = null
    }
  }

  const { data, error } = await supabase
    .from('shopping_items')
    .update(updates)
    .eq('id', itemId)
    .select(`
      *,
      added_by_profile:profiles!shopping_items_added_by_fkey(id, display_name, avatar_color)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/shopping-lists/[id]/items/[itemId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', itemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
