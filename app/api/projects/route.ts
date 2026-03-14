import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      created_by_profile:profiles!projects_created_by_fkey(id, display_name, avatar_color),
      project_contributions(
        id, amount, note, created_at,
        profiles!project_contributions_user_id_fkey(id, display_name, avatar_color)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calcule le montant total collecté
  const projectsWithTotal = (data || []).map((p) => ({
    ...p,
    current_amount: (p.project_contributions || []).reduce(
      (sum: number, c: { amount: number }) => sum + Number(c.amount), 0
    ),
  }))

  return NextResponse.json(projectsWithTotal)
}

// POST /api/projects
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, description, target_amount, deadline } = await request.json()
  if (!name || !target_amount) {
    return NextResponse.json({ error: 'Nom et montant cible requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name, description,
      target_amount: parseFloat(target_amount),
      deadline: deadline || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
