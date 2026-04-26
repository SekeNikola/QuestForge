import { useRef } from 'react'
import type { Theme } from '../../types/index'
import { ThemeCard } from '../ui/ThemeCard'
import { Sword, Rocket, Flag, Flame, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ThemeConfig {
  theme: Theme
  name: string
  description: string
  icon: LucideIcon
}

const THEMES: ThemeConfig[] = [
  {
    theme: 'dark_fantasy',
    name: 'Dark Fantasy',
    description: 'Grim dungeons, ancient curses, morally ambiguous heroes.',
    icon: Sword,
  },
  {
    theme: 'space_odyssey',
    name: 'Space Odyssey',
    description: 'Starships, alien worlds, and the void between stars.',
    icon: Rocket,
  },
  {
    theme: 'pirate_seas',
    name: 'Pirate Seas',
    description: 'Buried treasure, sea monsters, and cannon fire at dawn.',
    icon: Flag,
  },
  {
    theme: 'horror_manor',
    name: 'Horror Manor',
    description: 'Creaking floorboards, shadows that breathe, mysteries best left unsolved.',
    icon: Flame,
  },
  {
    theme: 'lego_universe',
    name: 'Lego Universe',
    description: 'Everything is awesome. Everything is made of bricks. Build your way to victory!',
    icon: Package,
  },
]

interface ThemePickerProps {
  selected: Theme | null
  onSelect: (theme: Theme) => void
}

export function ThemePicker({ selected, onSelect }: ThemePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const cards = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    if (!cards) return
    const arr = Array.from(cards)
    const idx = arr.findIndex((el) => el === document.activeElement)
    if (idx === -1) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      arr[(idx + 1) % arr.length]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      arr[(idx - 1 + arr.length) % arr.length]?.focus()
    }
  }

  return (
    <div>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-3">
        <span className="w-0.5 h-4 bg-violet-500 rounded-full" />
        Choose Your World
      </h3>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Game theme selection"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-5 gap-4"
      >
        {THEMES.map((t) => (
          <ThemeCard
            key={t.theme}
            {...t}
            selected={selected === t.theme}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
