'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Save, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchProfile, updateProfile } from '@/lib/api'
import type { Profile } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'

const AVATAR_COLORS = ['#e879f9','#818cf8','#22c55e','#ef4444','#f97316','#eab308','#14b8a6','#ec4899','#3b82f6','#a855f7']

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile().then(p => {
      setProfile(p)
      setDisplayName(p.display_name || '')
      setAvatarColor(p.avatar_color || '#6366f1')
    }).catch(() => {})
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const updated = await updateProfile({ display_name: displayName, avatar_color: avatarColor })
    setProfile(updated)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-xl font-bold text-[#fafafa]">Profil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <Avatar
          displayName={displayName || profile?.display_name || null}
          email={profile?.email}
          color={avatarColor}
          size="lg"
        />
        <p className="text-lg font-bold text-[#fafafa] mt-3">{displayName || 'Mon profil'}</p>
        <p className="text-sm text-[#a1a1aa]">{profile?.email}</p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-[#18181b] rounded-2xl p-4 border border-[#3f3f46] space-y-4">
          <div>
            <label className="text-xs text-[#a1a1aa] mb-1 block">Prénom Nom</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Votre prénom et nom"
            />
          </div>

          <div>
            <label className="text-xs text-[#a1a1aa] mb-2 block">Couleur d&apos;avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-9 h-9 rounded-full transition-transform ${avatarColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181b] scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={btnStyle}
        >
          <Save size={16} />
          {saved ? 'Sauvegardé ✓' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </form>

      {/* Liens utiles */}
      <div className="bg-[#18181b] rounded-2xl border border-[#3f3f46] overflow-hidden">
        <Link href="/categories" className="flex items-center justify-between px-4 py-3 border-b border-[#3f3f46]">
          <span className="text-sm text-[#fafafa]">🏷️ Gérer les catégories</span>
          <ChevronRight size={16} className="text-[#a1a1aa]" />
        </Link>
        <Link href="/shared-groups" className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[#fafafa]">🤝 Groupes partagés</span>
          <ChevronRight size={16} className="text-[#a1a1aa]" />
        </Link>
      </div>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[#ef4444]/10 text-[#ef4444]"
      >
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  )
}
