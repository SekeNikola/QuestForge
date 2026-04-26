import { Zap } from 'lucide-react'

interface QuickActionsProps {
  actions: string[]
  onAction: (action: string) => void
  isLoading: boolean
}

export function QuickActions({ actions, onAction, isLoading }: QuickActionsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 px-4 pb-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-8 bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (actions.length === 0) return null

  return (
    <div className="flex gap-2 px-4 pb-2" role="group" aria-label="Suggested actions">
      {actions.slice(0, 3).map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] hover:bg-[#16213e] border border-[#2d2d4e] hover:border-violet-500/50 rounded-lg text-xs text-gray-300 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 truncate"
        >
          <Zap size={10} className="text-violet-400 shrink-0" />
          <span className="truncate">{action}</span>
        </button>
      ))}
    </div>
  )
}
