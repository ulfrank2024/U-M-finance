'use client'
import { useState, useEffect } from 'react'
import type { Profile } from '@/lib/types'

let cached: Profile | null = null

export function useCurrentUser() {
  const [profile, setProfile] = useState<Profile | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { cached = d; setProfile(d) } })
      .finally(() => setLoading(false))
  }, [])

  return { profile, loading }
}
