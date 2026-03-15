import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Avatar from './ui/Avatar'
import Badge from './ui/Badge'

interface Props {
  transaction: Transaction
  onDelete?: (id: string) => void
}

export default function TransactionCard({ transaction, onDelete }: Props) {
  const { amount, description, type, scope, categories, profiles, updated_by_profile, credit_cards, bank_accounts, is_recurring, receipt_url } = transaction
  const isIncome = type === 'income'
  const displayProfile = updated_by_profile || profiles
  const paymentLabel = credit_cards ? `💳 ${credit_cards.name}` : bank_accounts ? `🏦 ${bank_accounts.name}` : null

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#18181b] border border-[#3f3f46]">
      {/* Icône catégorie */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: categories?.color ? `${categories.color}25` : '#27272a' }}
      >
        <span>{categories?.icon || '📁'}</span>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-[#fafafa] truncate">
            {description || categories?.name || (isIncome ? 'Revenu' : 'Dépense')}
          </p>
          {is_recurring && (
            <span className="flex-shrink-0 text-[10px] bg-[#818cf8]/20 text-[#818cf8] px-1.5 py-0.5 rounded-full">🔄</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {categories && (
            <span className="text-[11px] text-[#a1a1aa]">{categories.name}</span>
          )}
          {scope !== 'personal' && (
            <Badge variant={scope as 'common' | 'shared'} />
          )}
          {paymentLabel && (
            <span className="text-[10px] text-[#71717a] bg-[#27272a] px-1.5 py-0.5 rounded-full">{paymentLabel}</span>
          )}
          {receipt_url && (
            <a
              href={receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[10px] bg-[#e879f9]/20 text-[#e879f9] px-1.5 py-0.5 rounded-full"
            >
              📎
            </a>
          )}
        </div>
      </div>

      {/* Montant + avatar */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`font-semibold text-sm ${isIncome ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(amount)}
        </span>
        {displayProfile && (
          <Avatar
            displayName={displayProfile.display_name}
            email={displayProfile.email}
            color={displayProfile.avatar_color}
            avatarUrl={displayProfile.avatar_url}
            size="xs"
          />
        )}
      </div>
    </div>
  )
}
