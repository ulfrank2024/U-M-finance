import { getScopeLabel } from '@/lib/utils'

type Variant = 'personal' | 'common' | 'shared' | 'income' | 'expense' | 'active' | 'completed' | 'paused'

const styles: Record<Variant, string> = {
  personal:  'bg-[#3f3f46] text-[#a1a1aa]',
  common:    'bg-[#818cf8]/20 text-[#818cf8]',
  shared:    'bg-[#e879f9]/20 text-[#e879f9]',
  income:    'bg-[#22c55e]/20 text-[#22c55e]',
  expense:   'bg-[#ef4444]/20 text-[#ef4444]',
  active:    'bg-[#22c55e]/20 text-[#22c55e]',
  completed: 'bg-[#818cf8]/20 text-[#818cf8]',
  paused:    'bg-[#3f3f46] text-[#a1a1aa]',
}

const labels: Partial<Record<Variant, string>> = {
  personal: 'Personnel',
  common:   'Commun',
  shared:   'Partagé',
  income:   'Revenu',
  expense:  'Dépense',
  active:   'Actif',
  completed:'Terminé',
  paused:   'En pause',
}

interface Props {
  variant: Variant
  label?: string
  className?: string
}

export default function Badge({ variant, label, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[variant]} ${className}`}>
      {label ?? labels[variant] ?? variant}
    </span>
  )
}
