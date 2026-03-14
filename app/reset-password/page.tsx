'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/')
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#09090b]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}>
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa]">Nouveau mot de passe</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Choisis un nouveau mot de passe</p>
        </div>

        <div className="bg-[#18181b] rounded-2xl p-6 border border-[#3f3f46]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 caractères"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Confirmer</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Min. 8 caractères"
                required
              />
            </div>
            {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
              style={btnStyle}
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
