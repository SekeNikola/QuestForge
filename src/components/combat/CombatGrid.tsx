import { useState, useEffect } from 'react'
import type { GridUnit, GridPos, GridObstacle } from '../../hooks/useCombatGrid'
import { GRID_SIZE, hasCover } from '../../hooks/useCombatGrid'

const CELL = 40

const FALLBACK_STYLE = {
  background: 'radial-gradient(ellipse at 30% 40%, #1a0a2e 0%, #0a0a14 50%, #0d0d1a 100%)',
}

interface CombatGridProps {
  units: GridUnit[]
  obstacles: GridObstacle[]
  validMoves: GridPos[]
  validTargets: string[]
  playerDodging: boolean
  onCellClick: (pos: GridPos) => void
  onEnemyClick: (id: string) => void
  backgroundUrl: string
}

export function CombatGrid({
  units = [],
  obstacles = [],
  validMoves = [],
  validTargets = [],
  playerDodging = false,
  onCellClick,
  onEnemyClick,
  backgroundUrl,
}: CombatGridProps) {
  const SIZE = CELL * GRID_SIZE
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
  }, [backgroundUrl])

  const showFallback = !backgroundUrl || imgError
  const player = units.find(u => u.isPlayer && u.hp > 0)
  const playerCover = player ? hasCover(player.pos, obstacles) : false

  const getObstacle = (x: number, y: number) => obstacles.find(o => o.x === x && o.y === y)

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: SIZE, height: SIZE, ...(showFallback || !imgLoaded ? FALLBACK_STYLE : {}) }}
    >
      {/* Background map */}
      {backgroundUrl && !imgError && (
        <img
          src={backgroundUrl}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${imgLoaded ? 'opacity-55' : 'opacity-0'}`}
          alt=""
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}

      {/* Cell grid */}
      <div
        className="absolute inset-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL}px)`,
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const x = i % GRID_SIZE
          const y = Math.floor(i / GRID_SIZE)
          const isMove = validMoves.some(m => m.x === x && m.y === y)
          const obs = getObstacle(x, y)
          return (
            <div
              key={i}
              onClick={() => !obs && onCellClick({ x, y })}
              className={[
                'border border-white/[0.07] transition-colors relative',
                obs
                  ? 'bg-amber-900/30 border-amber-700/40 cursor-not-allowed'
                  : isMove
                  ? 'bg-emerald-400/20 hover:bg-emerald-400/35 cursor-pointer'
                  : 'hover:bg-white/[0.04] cursor-default',
              ].join(' ')}
            >
              {/* Obstacle tile */}
              {obs && (
                <div className="absolute inset-0 flex items-center justify-center text-lg select-none pointer-events-none">
                  <span style={{ fontSize: 18, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                    {obs.icon}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cover highlight: ring around player when in cover */}
      {player && playerCover && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: player.pos.x * CELL + 2,
            top: player.pos.y * CELL + 2,
            width: CELL - 4,
            height: CELL - 4,
            borderRadius: '50%',
            boxShadow: '0 0 12px 4px rgba(56,189,248,0.45)',
            border: '1px solid rgba(56,189,248,0.3)',
          }}
        />
      )}

      {/* Unit tokens */}
      {units.map(unit => {
        const isTarget = validTargets.includes(unit.id)
        const isDead = unit.hp <= 0
        const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100)
        const hpColor = hpPct > 50
          ? (unit.isPlayer ? '#a78bfa' : '#f87171')
          : hpPct > 25 ? '#fb923c' : '#ef4444'
        const inCover = unit.isPlayer && playerCover

        return (
          <div
            key={unit.id}
            className={`absolute transition-all duration-300 pointer-events-none ${isDead ? 'opacity-20' : ''}`}
            style={{ left: unit.pos.x * CELL, top: unit.pos.y * CELL, width: CELL, height: CELL }}
          >
            <div
              onClick={() => !unit.isPlayer && !isDead && onEnemyClick(unit.id)}
              className={[
                'absolute inset-1.5 rounded-full flex flex-col items-center justify-center pointer-events-auto select-none',
                isDead
                  ? 'bg-gray-900/80 border-2 border-gray-700'
                  : unit.isPlayer
                  ? 'bg-violet-700/90 border-2 border-violet-400 shadow-lg shadow-violet-900/60'
                  : 'bg-red-900/90 border-2 border-red-500 shadow-lg shadow-red-900/60',
                !isDead && isTarget
                  ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent animate-pulse cursor-crosshair'
                  : '',
                !isDead && !unit.isPlayer && !isTarget ? 'cursor-default' : '',
                !isDead && unit.isPlayer && playerDodging
                  ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent'
                  : '',
              ].join(' ')}
            >
              <span className="text-[11px] font-bold text-white leading-none">
                {isDead ? '✕'
                  : unit.isPlayer && (playerDodging || inCover) ? (playerDodging ? '🛡' : '🫣')
                  : unit.name.charAt(0).toUpperCase()}
              </span>
              {!isDead && (
                <span className="text-[8px] text-white/60 font-mono leading-none mt-0.5">{unit.hp}</span>
              )}
            </div>

            {/* HP bar */}
            {!isDead && (
              <div className="absolute bottom-0.5 left-1.5 right-1.5 h-1.5 bg-black/70 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${hpPct}%`, background: hpColor }}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Target hint when enemies are in range */}
      {validTargets.length > 0 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-yellow-300/80 bg-black/60 px-2 py-0.5 rounded-full">
            Click an enemy to attack
          </span>
        </div>
      )}
    </div>
  )
}
