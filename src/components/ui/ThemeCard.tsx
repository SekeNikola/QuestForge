import type { Theme } from '../../types/index'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'

interface ThemeCardProps {
  theme: Theme
  name: string
  description: string
  icon: LucideIcon
  selected: boolean
  onSelect: (theme: Theme) => void
  className?: string
}

export function ThemeCard({ theme, name, description, icon: Icon, selected, onSelect, className = '' }: ThemeCardProps) {
  return (
    <button
      onClick={() => onSelect(theme)}
      role="radio"
      aria-checked={selected}
      className={[
        'relative flex flex-col gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl border text-left min-w-0 w-full h-full',
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
        selected
          ? 'bg-[#1a1436] border-violet-500'
          : 'bg-[#12122a] border-[#252545] hover:border-[#3d3d6e]',
        className,
      ].join(' ')}
      style={selected ? { boxShadow: '0 0 0 1px rgba(124,58,237,0.25)' } : {}}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
          <Check size={11} className="text-white" strokeWidth={3} />
        </span>
      )}
      <span className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0d0d1e] border border-[#252545] rounded-xl flex items-center justify-center text-violet-400 shrink-0">
        <Icon size={16} strokeWidth={1.5} className="sm:hidden" />
        <Icon size={19} strokeWidth={1.5} className="hidden sm:block" />
      </span>
      <div>
        <p className="text-white font-bold text-xs sm:text-[15px] leading-tight">{name}</p>
        <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-1.5 leading-snug hidden sm:block">{description}</p>
      </div>
    </button>
  )
}
