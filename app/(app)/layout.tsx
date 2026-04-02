import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import UpdateBanner from '@/components/UpdateBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <UpdateBanner />

      {/* Sidebar desktop */}
      <SideNav />

      {/* Contenu : centré sur mobile, décalé à droite de la sidebar sur desktop */}
      <main className="pb-20 max-w-lg mx-auto md:pb-8 md:ml-56 md:max-w-none md:mx-0">
        <div className="md:max-w-5xl md:mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom nav uniquement sur mobile */}
      <BottomNav />
    </div>
  )
}
