import type { CreditCard } from '@/lib/types'
import { formatCurrency, getProgressPercent } from '@/lib/utils'
import ProgressBar from './ui/ProgressBar'
import Avatar from './ui/Avatar'

interface Props { card: CreditCard }

export default function CreditCardWidget({ card }: Props) {
  const { name, last_four, credit_limit, due_date, is_shared, owner, total_spent, current_balance } = card
  const usagePercent = credit_limit ? getProgressPercent(total_spent, credit_limit) : 0

  return (
    <div className="rounded-2xl p-4 min-w-[280px] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: '1px solid rgba(129,140,248,0.3)' }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-white text-sm">{name}</p>
          {last_four && (
            <p className="text-[#818cf8] text-xs mt-0.5">•••• {last_four}</p>
          )}
        </div>
        {is_shared ? (
          <span className="text-[10px] bg-[#818cf8]/20 text-[#818cf8] px-2 py-0.5 rounded-full">Commune</span>
        ) : owner ? (
          <Avatar displayName={owner.display_name} color={owner.avatar_color} avatarUrl={owner.avatar_url} size="xs" />
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {credit_limit && (
          <div>
            <p className="text-[10px] text-[#818cf8]/70">Limite</p>
            <p className="text-xs font-semibold text-white">{formatCurrency(credit_limit)}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-[#818cf8]/70">Utilisé</p>
          <p className="text-xs font-semibold text-white">{formatCurrency(total_spent)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#818cf8]/70">Solde dû</p>
          <p className={`text-xs font-semibold ${current_balance > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
            {formatCurrency(current_balance)}
          </p>
        </div>
      </div>

      {credit_limit && <ProgressBar value={usagePercent} color="#818cf8" />}

      {due_date && (
        <p className="text-[10px] text-[#818cf8]/70 mt-2">Échéance le {due_date} du mois</p>
      )}
    </div>
  )
}
