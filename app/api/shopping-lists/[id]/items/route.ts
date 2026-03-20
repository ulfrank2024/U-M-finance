import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/shopping-lists/[id]/items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, quantity, estimated_price } = await request.json()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      list_id: id,
      name,
      quantity: quantity || null,
      estimated_price: estimated_price ?? null,
      added_by: user.id,
    })
    .select(`
      *,
      added_by_profile:profiles!shopping_items_added_by_fkey(id, display_name, avatar_color)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
