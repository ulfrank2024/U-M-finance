'use client'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function UpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Signal reçu du service worker : nouvelle version activée
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SW_UPDATED') setShow(true)
    }

    // Fallback : le controller change = nouveau SW a pris le contrôle
    const onControllerChange = () => setShow(true)

    navigator.serviceWorker.addEventListener('message', onMessage)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 text-sm"
      style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}
    >
      <span className="text-white font-medium">Nouvelle version disponible ✨</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <RefreshCw size={13} />
        Actualiser
      </button>
    </div>
  )
}
