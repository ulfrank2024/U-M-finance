'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (form.password.length < 6) { setError('Mot de passe trop court (min. 6 caractères)'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { display_name: form.name } },
    })
    if (err) { setError(err.message); setLoading(false); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#09090b]">
        <div className="text-center max-w-sm">
          <span className="text-5xl mb-4 block">📧</span>
          <h2 className="text-xl font-bold text-[#fafafa] mb-2">Vérifiez votre email</h2>
          <p className="text-[#a1a1aa] text-sm">Un lien de confirmation a été envoyé à <strong>{form.email}</strong></p>
          <Link href="/login" className="mt-6 inline-block text-[#e879f9] text-sm font-medium">Retour à la connexion</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#09090b]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}>
            <span className="text-3xl">💑</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa]">U&M Finance</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Créez votre compte</p>
        </div>

        <div className="bg-[#18181b] rounded-2xl p-6 border border-[#3f3f46]">
          <h2 className="text-lg font-semibold text-[#fafafa] mb-4">Inscription</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Prénom Nom</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ulrich Lontsi" required />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.com" required />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Mot de passe</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Confirmer</label>
              <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" required />
            </div>
            {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #e879f9, #818cf8)' }}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#a1a1aa] mt-4">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-[#e879f9] font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
