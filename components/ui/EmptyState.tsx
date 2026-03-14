interface Props {
  icon: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-[#fafafa] font-semibold text-base mb-1">{title}</p>
      {description && <p className="text-[#a1a1aa] text-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
