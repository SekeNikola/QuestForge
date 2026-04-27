import { Zap } from 'lucide-react'

interface QuickActionsProps {
  actions: string[]
  onAction: (action: string) => void
  isLoading: boolean
}

export function QuickActions({ actions, onAction, isLoading }: QuickActionsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 px-4 pb-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full h-8 bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (actions.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 px-4 pb-2" role="group" aria-label="Suggested actions">
      {actions.slice(0, 3).map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="w-full flex items-start gap-1.5 px-3 py-2 bg-[#1a1a2e] hover:bg-[#16213e] border border-[#2d2d4e] hover:border-violet-500/50 rounded-lg text-xs text-gray-300 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 text-left"
        >
          <Zap size={10} className="text-violet-400 shrink-0 mt-0.5" />
          <span className="leading-snug">{action}</span>
        </button>
      ))}
    </div>
  )
}
