import { Shield } from 'lucide-react'

export function KidsModeBadge() {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-semibold"
      aria-label="Kids Mode is active"
    >
      <Shield size={12} fill="currentColor" />
      <span>Kids Mode</span>
    </div>
  )
}
