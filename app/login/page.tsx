'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#09090b]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}>
            <span className="text-3xl">💑</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa]">U&M Finance</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Gérez vos finances ensemble</p>
        </div>

        {/* Formulaire */}
        <div className="bg-[#18181b] rounded-2xl p-6 border border-[#3f3f46]">
          <h2 className="text-lg font-semibold text-[#fafafa] mb-4">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#a1a1aa]">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs text-[#e879f9]">Oublié ?</Link>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#a1a1aa] mt-4">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-[#e879f9] font-medium">S&apos;inscrire</Link>
        </p>
      </div>
    </div>
  )
}
