'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', birthday: '' })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (form.password.length < 8) { setError('Mot de passe trop court (min. 8 caractères)'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { display_name: form.name } },
    })
    if (err) { setError(err.message); setLoading(false); return }

    if (data.session && data.user) {
      let avatarUrl: string | null = null

      // Upload photo si sélectionnée
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${data.user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
        }
      }

      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: form.name, avatar_url: avatarUrl, birthday: form.birthday || undefined }),
      })
      window.location.href = '/'
      return
    }
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

            {/* Photo de profil */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-[#3f3f46] flex items-center justify-center transition-colors hover:border-[#e879f9]"
                style={photoPreview ? {} : {}}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera size={22} className="text-[#a1a1aa]" />
                    <span className="text-[10px] text-[#71717a]">Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={18} className="text-white" />
                </div>
              </button>
              <span className="text-[11px] text-[#71717a]">Photo de profil (optionnel)</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
            </div>

            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Prénom Nom</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ulrich Lontsi" required />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Date d&apos;anniversaire</label>
              <input
                type="date"
                value={form.birthday}
                onChange={e => setForm({ ...form, birthday: e.target.value })}
                className="w-full px-4 py-3 bg-[#27272a] rounded-xl text-sm text-[#fafafa] border border-[#3f3f46] focus:outline-none focus:border-[#e879f9]"
              />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.com" required />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Mot de passe</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 caractères" required />
            </div>
            <div>
              <label className="text-xs text-[#a1a1aa] mb-1 block">Confirmer</label>
              <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="Min. 8 caractères" required />
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
