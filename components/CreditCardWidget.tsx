import type { CreditCard } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import Avatar from './ui/Avatar'

interface Props { card: CreditCard }

function getUsageColor(pct: number, overLimit: boolean) {
  if (overLimit) return '#ef4444'
  if (pct >= 90) return '#f97316'
  if (pct >= 70) return '#eab308'
  return '#22c55e'
}

export default function CreditCardWidget({ card }: Props) {
  const { name, last_four, credit_limit, due_date, is_shared, owner, total_spent, current_balance } = card
  const overLimit = credit_limit != null && current_balance > credit_limit
  const available = credit_limit != null ? credit_limit - current_balance : null
  const usagePct  = credit_limit ? Math.min(120, Math.round((current_balance / credit_limit) * 100)) : 0
  const barColor  = getUsageColor(usagePct, overLimit)

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: overLimit
          ? 'linear-gradient(135deg, #2d0a0a 0%, #450a0a 100%)'
          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        border: overLimit ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(129,140,248,0.3)',
      }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${barColor}, transparent)` }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white text-sm">{name}</p>
          {last_four && <p className="text-xs mt-0.5" style={{ color: overLimit ? '#fca5a5' : '#818cf8' }}>•••• {last_four}</p>}
        </div>
        <div className="flex items-center gap-2">
          {overLimit && (
            <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-semibold">
              ⚠️ Dépassé
            </span>
          )}
          {is_shared ? (
            <span className="text-[10px] bg-[#818cf8]/20 text-[#818cf8] px-2 py-0.5 rounded-full">Commune</span>
          ) : owner ? (
            <Avatar displayName={owner.display_name} color={owner.avatar_color} avatarUrl={owner.avatar_url} size="xs" />
          ) : null}
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {credit_limit != null && (
          <div>
            <p className="text-[10px] opacity-60 text-white">Limite</p>
            <p className="text-xs font-semibold text-white">{formatCurrency(credit_limit)}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] opacity-60 text-white">Utilisé</p>
          <p className="text-xs font-semibold" style={{ color: barColor }}>{formatCurrency(total_spent)}</p>
        </div>
        <div>
          <p className="text-[10px] opacity-60 text-white">{overLimit ? 'Dépassement' : 'Solde dû'}</p>
          <p className="text-xs font-semibold" style={{ color: overLimit ? '#ef4444' : current_balance > 0 ? '#fca5a5' : '#22c55e' }}>
            {overLimit ? '+' : ''}{formatCurrency(current_balance)}
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      {credit_limit != null && (
        <div className="mb-2">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, usagePct)}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] opacity-50 text-white">{usagePct}% utilisé</span>
            {available != null && (
              <span className="text-[10px]" style={{ color: overLimit ? '#ef4444' : '#a5b4fc' }}>
                {overLimit ? `${formatCurrency(Math.abs(available))} de dépassement` : `${formatCurrency(available)} disponible`}
              </span>
            )}
          </div>
        </div>
      )}

      {due_date && (
        <p className="text-[10px] opacity-50 text-white mt-1">📅 Échéance le {due_date} du mois</p>
      )}
    </div>
  )
}
