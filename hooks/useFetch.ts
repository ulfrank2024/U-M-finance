'use client'
import { useState, useEffect, useCallback } from 'react'

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(url, { signal: controller.signal })
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error || 'Erreur')))
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e?.name !== 'AbortError') { setError(String(e)); setLoading(false) } })
    return () => controller.abort()
  }, [url, tick])

  return { data, loading, error, refetch }
}
