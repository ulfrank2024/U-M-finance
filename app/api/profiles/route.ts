import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/profiles — returns all profiles (for partner birthday display)
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_color, avatar_url, birthday')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
