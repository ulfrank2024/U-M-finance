import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const publicPaths = ['/login', '/register', '/auth/callback', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  // Ne pas rediriger les paths publics
  if (isPublicPath) return supabaseResponse

  // Vérifier la session — en cas d'erreur réseau, laisser passer
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user && !error) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  } catch {
    // Erreur réseau → on laisse passer pour éviter la boucle
  }

  return supabaseResponse
}
