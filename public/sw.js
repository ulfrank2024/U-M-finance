const CACHE = 'um-finance-v1'
const STATIC_ROUTES = ['/', '/transactions', '/projects', '/credit-cards', '/profile']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ROUTES).catch(() => {}))
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  // Toujours réseau pour les API et auth
  if (e.request.url.includes('/api/') || e.request.url.includes('supabase.co')) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const clone = response.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return response
      }).catch(() => cached)
    })
  )
})
