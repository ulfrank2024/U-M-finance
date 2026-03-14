'use client'
import { Check } from 'lucide-react'

export interface PickerOption {
  value: string
  label: string
  icon?: string
  subtitle?: string
  color?: string
}

interface PickerModalProps {
  isOpen: boolean
  title: string
  options: PickerOption[]
  value: string
  onSelect: (value: string) => void
  onClose: () => void
  nullable?: boolean       // affiche "Aucun" en premier
  nullLabel?: string       // texte de l'option vide (défaut: "Aucun")
}

export default function PickerModal({
  isOpen, title, options, value, onSelect, onClose,
  nullable = false, nullLabel = 'Aucun',
}: PickerModalProps) {
  if (!isOpen) return null

  function pick(v: string) {
    onSelect(v)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl border-t border-[#3f3f46] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#3f3f46]" />
        </div>

        <p className="text-base font-bold text-[#fafafa] px-5 py-3">{title}</p>

        <div className="overflow-y-auto max-h-[60vh] pb-6">
          {nullable && (
            <button
              onClick={() => pick('')}
              className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
                value === '' ? 'bg-[#27272a]' : 'hover:bg-[#27272a]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#27272a] flex items-center justify-center text-lg">
                  <span className="text-[#71717a]">✕</span>
                </div>
                <span className="text-sm text-[#a1a1aa]">{nullLabel}</span>
              </div>
              {value === '' && <Check size={16} className="text-[#e879f9]" />}
            </button>
          )}

          {options.map(opt => {
            const isSelected = value === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => pick(opt.value)}
                className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
                  isSelected ? 'bg-[#27272a]' : 'active:bg-[#27272a]/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icône ou couleur */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: opt.color ? `${opt.color}25` : '#27272a' }}
                  >
                    {opt.icon ? (
                      <span>{opt.icon}</span>
                    ) : opt.color ? (
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: opt.color }} />
                    ) : (
                      <span className="text-[#a1a1aa] text-sm">—</span>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#fafafa]' : 'text-[#d4d4d8]'}`}>
                      {opt.label}
                    </p>
                    {opt.subtitle && (
                      <p className="text-[11px] text-[#71717a] truncate">{opt.subtitle}</p>
                    )}
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-[#e879f9] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
