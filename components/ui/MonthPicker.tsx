'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthLabel, prevMonth, nextMonth } from '@/lib/utils'

interface Props {
  value: string
  onChange: (month: string) => void
}

export default function MonthPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(prevMonth(value))}
        className="p-1.5 rounded-full hover:bg-[#27272a] text-[#a1a1aa]"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium capitalize text-[#fafafa] min-w-[110px] text-center">
        {formatMonthLabel(value)}
      </span>
      <button
        onClick={() => onChange(nextMonth(value))}
        className="p-1.5 rounded-full hover:bg-[#27272a] text-[#a1a1aa]"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
