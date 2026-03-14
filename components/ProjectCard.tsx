import type { Project } from '@/lib/types'
import { formatCurrency, getProgressPercent } from '@/lib/utils'
import ProgressBar from './ui/ProgressBar'
import Badge from './ui/Badge'
import Avatar from './ui/Avatar'

interface Props { project: Project }

export default function ProjectCard({ project }: Props) {
  const { name, description, target_amount, current_amount, deadline, status, project_contributions } = project
  const percent = getProgressPercent(current_amount, target_amount)

  return (
    <div className="p-4 rounded-2xl bg-[#18181b] border border-[#3f3f46]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#fafafa] text-sm truncate">{name}</h3>
          {description && (
            <p className="text-[11px] text-[#a1a1aa] truncate mt-0.5">{description}</p>
          )}
        </div>
        <Badge variant={status} className="ml-2 flex-shrink-0" />
      </div>

      <ProgressBar value={percent} className="my-3" />

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-[#e879f9] font-semibold">{formatCurrency(current_amount)}</span>
          <span className="text-[#a1a1aa]"> / {formatCurrency(target_amount)}</span>
        </div>
        <span className="text-[#a1a1aa]">{percent}%</span>
      </div>

      <div className="flex items-center justify-between mt-3">
        {/* Avatars des contributeurs */}
        <div className="flex -space-x-1">
          {(project_contributions || []).slice(0, 3).map((c) => c.profiles && (
            <Avatar
              key={c.id}
              displayName={c.profiles.display_name}
              color={c.profiles.avatar_color}
              avatarUrl={c.profiles.avatar_url}
              size="xs"
            />
          ))}
        </div>
        {deadline && (
          <span className="text-[11px] text-[#a1a1aa]">
            📅 {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(deadline))}
          </span>
        )}
      </div>
    </div>
  )
}
