interface Props {
  value: number  // 0-100
  color?: string
  className?: string
}

export default function ProgressBar({ value, color = '#e879f9', className = '' }: Props) {
  return (
    <div className={`w-full h-2 bg-[#27272a] rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  )
}
