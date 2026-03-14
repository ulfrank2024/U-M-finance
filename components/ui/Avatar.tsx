import { getInitials } from '@/lib/utils'

interface Props {
  displayName: string | null
  email?: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizes = {
  xs: { cls: 'w-5 h-5 text-[10px]' },
  sm: { cls: 'w-7 h-7 text-xs' },
  md: { cls: 'w-9 h-9 text-sm' },
  lg: { cls: 'w-14 h-14 text-lg' },
}

export default function Avatar({ displayName, email, color = '#6366f1', size = 'md' }: Props) {
  return (
    <div
      className={`${sizes[size].cls} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {getInitials(displayName, email)}
    </div>
  )
}
