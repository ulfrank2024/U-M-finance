import type { BalanceResponse } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import Avatar from './ui/Avatar'

interface Props { data: BalanceResponse }

export default function BalanceCard({ data }: Props) {
  const { summary, balance, couple_total } = data

  return (
    <div className="rounded-2xl p-4 border border-[#3f3f46] overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #18181b 0%, #1a1030 100%)' }}>
      {/* Glow décoratif */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #e879f9, transparent)' }} />

      <h2 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Balance du mois</h2>

      {/* Les deux partenaires */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {summary.map((p) => (
          <div key={p.user_id} className="bg-[#27272a]/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Avatar displayName={p.display_name} color={p.avatar_color} avatarUrl={p.avatar_url} size="sm" />
              <span className="text-sm font-medium text-[#fafafa] truncate">{p.display_name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#a1a1aa]">Revenus</span>
                <span className="text-[#22c55e]">{formatCurrency(p.income)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#a1a1aa]">Dépenses</span>
                <span className="text-[#ef4444]">{formatCurrency(p.total_expenses)}</span>
              </div>
              {p.card_debt > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#a1a1aa]">💳 Dette carte</span>
                  <span className="text-[#f97316]">{formatCurrency(p.card_debt)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs border-t border-[#3f3f46] pt-1 mt-1">
                <span className="text-[#a1a1aa]">Net</span>
                <span className={p.net >= 0 ? 'text-[#22c55e] font-semibold' : 'text-[#ef4444] font-semibold'}>
                  {formatCurrency(p.net)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total couple */}
      <div className="flex justify-between items-center pt-2 border-t border-[#3f3f46]">
        <span className="text-xs text-[#a1a1aa]">Total couple</span>
        <span className={`text-sm font-bold ${couple_total.net >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {formatCurrency(couple_total.net)}
        </span>
      </div>

    </div>
  )
}
