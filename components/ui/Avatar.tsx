import { getInitials } from '@/lib/utils'
import Image from 'next/image'

interface Props {
  displayName: string | null
  email?: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  avatarUrl?: string | null
}

const sizes = {
  xs: { cls: 'w-5 h-5 text-[10px]', px: 20 },
  sm: { cls: 'w-7 h-7 text-xs',     px: 28 },
  md: { cls: 'w-9 h-9 text-sm',     px: 36 },
  lg: { cls: 'w-14 h-14 text-lg',   px: 56 },
}

export default function Avatar({ displayName, email, color = '#6366f1', size = 'md', avatarUrl }: Props) {
  const { cls, px } = sizes[size]

  if (avatarUrl) {
    return (
      <div className={`${cls} rounded-full overflow-hidden flex-shrink-0`}>
        <Image
          src={avatarUrl}
          alt={displayName || 'Avatar'}
          width={px}
          height={px}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    )
  }

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {getInitials(displayName, email)}
    </div>
  )
}
