import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// DELETE /api/transfers/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Récupérer les IDs des transactions liées avant suppression
  const { data: transfer } = await admin
    .from('transfers')
    .select('tx_from_id, tx_to_id')
    .eq('id', id)
    .single()

  // Supprimer le virement
  const { error } = await admin.from('transfers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Supprimer les transactions liées
  const txIds = [
    (transfer as { tx_from_id: string | null; tx_to_id: string | null } | null)?.tx_from_id,
    (transfer as { tx_from_id: string | null; tx_to_id: string | null } | null)?.tx_to_id,
  ].filter(Boolean) as string[]

  if (txIds.length > 0) {
    await admin.from('transactions').delete().in('id', txIds)
  }

  return NextResponse.json({ success: true })
}
