interface HPBarProps {
  current: number
  max: number
  label?: string
  showNumbers?: boolean
  className?: string
}

export function HPBar({ current, max, label, showNumbers = true, className = '' }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0

  const color =
    pct > 50
      ? 'bg-green-500'
      : pct > 25
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <div className={`w-full ${className}`}>
      {(label || showNumbers) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs font-sans text-gray-400 uppercase tracking-wider">{label}</span>}
          {showNumbers && (
            <span className="text-xs text-gray-300 font-mono">
              {current} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className="w-full h-2.5 bg-[#2d2d4e] rounded-full overflow-hidden"
        role="meter"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'HP'}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
