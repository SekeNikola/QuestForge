import { useState, useEffect } from 'react'
import type { DiceRoll } from '../../hooks/useCombatGrid'

interface DiceRollerProps {
  rolls: DiceRoll[]
}

export function DiceRoller({ rolls }: DiceRollerProps) {
  const safeRolls = rolls ?? []
  const recent = safeRolls.slice(-6).reverse()
  const [animatingKey, setAnimatingKey] = useState<number | null>(null)

  useEffect(() => {
    if (safeRolls.length === 0) return
    const latest = safeRolls[safeRolls.length - 1]
    if (!latest) return
    setAnimatingKey(latest.key)
    const t = setTimeout(() => setAnimatingKey(null), 600)
    return () => clearTimeout(t)
  }, [safeRolls.length])

  return (
    <div className="p-3 space-y-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-2">
        Dice Rolls
      </span>

      {recent.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-2">No rolls yet</p>
      ) : (
        recent.map(roll => (
          <div
            key={roll.key}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0f0f1a] border border-[#2d2d4e]"
          >
            {/* Dice faces */}
            <div className="flex gap-1 flex-wrap shrink-0">
              {roll.values.map((v, i) => (
                <div
                  key={i}
                  className={[
                    'w-7 h-7 rounded flex items-center justify-center text-sm font-bold border select-none',
                    roll.sides === 20
                      ? 'bg-violet-900/80 text-violet-200 border-violet-700'
                      : 'bg-orange-900/60 text-orange-200 border-orange-800/50',
                    animatingKey === roll.key ? 'dice-rolling' : '',
                  ].join(' ')}
                >
                  {v}
                </div>
              ))}
            </div>

            {/* Label + total */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 truncate leading-tight">{roll.label}</p>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-sm font-bold text-white">{roll.total}</span>
                {roll.isHit === true && (
                  <span className="text-[10px] font-semibold text-emerald-400">Hit!</span>
                )}
                {roll.isHit === false && (
                  <span className="text-[10px] font-semibold text-red-400">Miss</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
