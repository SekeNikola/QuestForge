import { useState, useEffect, useRef } from 'react'
import type { DiceRoll } from '../../hooks/useCombatGrid'

function RollingDie({ sides, value, rolling }: { sides: number; value: number; rolling: boolean }) {
  const [shown, setShown] = useState(value)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (rolling) {
      timer.current = setInterval(() => setShown(Math.floor(Math.random() * sides) + 1), 55)
    } else {
      setShown(value)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [rolling, value, sides])

  if (sides === 20) {
    return (
      <div
        className="flex items-center justify-center font-black text-white select-none"
        style={{
          width: 128, height: 128, fontSize: 52,
          clipPath: 'polygon(50% 4%, 96% 28%, 96% 72%, 50% 96%, 4% 72%, 4% 28%)',
          background: rolling
            ? 'linear-gradient(135deg, #4c1d95, #6d28d9)'
            : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          boxShadow: rolling ? '0 0 60px #7c3aed88' : '0 0 80px #a855f7aa',
          transition: 'background 0.3s, box-shadow 0.3s',
          transform: rolling ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {shown}
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-center font-black text-white select-none rounded-2xl"
      style={{
        width: 88, height: 88, fontSize: 40,
        background: rolling
          ? 'linear-gradient(135deg, #78350f, #b45309)'
          : 'linear-gradient(135deg, #d97706, #f59e0b)',
        boxShadow: rolling ? '0 0 40px #d9770688' : '0 0 50px #f59e0baa',
        transition: 'background 0.3s, box-shadow 0.3s',
      }}
    >
      {shown}
    </div>
  )
}

interface Props { latestRoll: DiceRoll | null }

export function DiceOverlay({ latestRoll }: Props) {
  const [phase, setPhase] = useState<'hidden' | 'rolling' | 'result'>('hidden')
  const [roll, setRoll] = useState<DiceRoll | null>(null)
  const lastKey = useRef(-1)

  useEffect(() => {
    if (!latestRoll || latestRoll.key === lastKey.current) return
    if (latestRoll.sides !== 20) return
    lastKey.current = latestRoll.key
    setRoll(latestRoll)
    setPhase('rolling')
    const t1 = setTimeout(() => setPhase('result'), 900)
    return () => clearTimeout(t1)
  }, [latestRoll])

  if (phase === 'hidden' || !roll) return null

  const rolling = phase === 'rolling'
  const isHit = roll.isHit

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgba(5,5,20,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: rolling ? 'none' : 'auto',
      }}
      onClick={rolling ? undefined : () => setPhase('hidden')}
    >
      <div
        className="flex flex-col items-center gap-5"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #0e0e24ee, #0a0a1aee)',
          border: '1px solid #3d2d6e',
          borderRadius: 28,
          padding: '40px 56px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(109,40,217,0.15)',
        }}
      >
        {/* Label */}
        <p className="text-gray-400 text-xs uppercase tracking-[0.25em] font-semibold">
          {roll.label}
        </p>

        {/* Die face */}
        <div className="flex gap-6">
          {roll.values.map((v, i) => (
            <RollingDie key={i} sides={roll.sides} value={v} rolling={rolling} />
          ))}
        </div>

        {/* DC bar */}
        {!rolling && roll.dc !== undefined && (
          <div className="w-40 text-center">
            <p className="text-gray-500 text-xs mb-1.5">
              need <span className="text-white font-bold">{roll.dc}</span> or higher
            </p>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, (roll.total / roll.dc) * 60 + 10)}%`,
                  background: isHit ? '#34d399' : '#f87171',
                }}
              />
            </div>
          </div>
        )}

        {/* Total + result */}
        {!rolling && (
          <div className="text-center">
            <p
              className="font-black leading-none"
              style={{
                fontSize: 56,
                color: isHit === undefined ? 'white' : isHit ? '#34d399' : '#f87171',
                textShadow: isHit === undefined
                  ? '0 0 20px rgba(255,255,255,0.3)'
                  : isHit
                  ? '0 0 30px rgba(52,211,153,0.5)'
                  : '0 0 30px rgba(248,113,113,0.5)',
              }}
            >
              {roll.total}
            </p>
            {isHit !== undefined && (
              <p
                className="font-black mt-1 text-lg tracking-widest"
                style={{ color: isHit ? '#34d399' : '#f87171' }}
              >
                {isHit
                  ? (roll.dc ? '✓ SUCCESS' : '✓ HIT')
                  : (roll.dc ? '✗ FAILED' : '✗ MISS')
                }
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        {!rolling && (
          <button
            onClick={() => setPhase('hidden')}
            className="mt-1 px-6 py-1.5 rounded-full border border-[#3d2d6e] text-gray-400 hover:text-white hover:border-violet-500 text-xs font-medium tracking-wider uppercase transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}
