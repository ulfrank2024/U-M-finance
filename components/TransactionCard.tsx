import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Avatar from './ui/Avatar'
import Badge from './ui/Badge'

interface Props {
  transaction: Transaction
  onDelete?: (id: string) => void
}

export default function TransactionCard({ transaction, onDelete }: Props) {
  const { amount, description, type, scope, categories, profiles, updated_by_profile } = transaction
  const isIncome = type === 'income'
  const displayProfile = updated_by_profile || profiles

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
        <p className="text-sm font-medium text-[#fafafa] truncate">
          {description || categories?.name || (isIncome ? 'Revenu' : 'Dépense')}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {categories && (
            <span className="text-[11px] text-[#a1a1aa]">{categories.name}</span>
          )}
          {scope !== 'personal' && (
            <Badge variant={scope as 'common' | 'shared'} />
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
            size="xs"
          />
        )}
      </div>
    </div>
  )
}
