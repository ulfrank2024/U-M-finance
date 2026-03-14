'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setSent(true)
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#09090b]">
        <div className="text-center max-w-sm">
          <span className="text-5xl mb-4 block">📧</span>
          <h2 className="text-xl font-bold text-[#fafafa] mb-2">Email envoyé !</h2>
          <p className="text-[#a1a1aa] text-sm mb-1">
            Un lien de réinitialisation a été envoyé à
          </p>
          <p className="text-[#e879f9] font-medium text-sm mb-6">{email}</p>
          <p className="text-[#a1a1aa] text-xs mb-6">Vérifie aussi tes spams.</p>
          <Link href="/login" className="text-[#e879f9] text-sm font-medium">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#09090b]">
      <div className="w-full max-w-sm">
        <Link href="/login" className="flex items-center gap-2 text-[#a1a1aa] text-sm mb-6">
          <ArrowLeft size={16} /> Retour
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}>
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa]">Mot de passe oublié</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">On t&apos;envoie un lien de réinitialisation</p>
        </div>

        <div className="bg-[#18181b] rounded-2xl p-6 border border-[#3f3f46]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60"
              style={btnStyle}
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
