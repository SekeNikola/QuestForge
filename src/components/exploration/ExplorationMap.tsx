import { useState, useEffect } from 'react'
import type { SceneObject, SceneProximity, SceneDirection } from '../../types/index'

const GRID_SIZE = 8
const CELL = 40
const SIZE = CELL * GRID_SIZE

// Player always at (3, 5) — center-left, lower third
const PLAYER_POS = { x: 3, y: 5 }

const FALLBACK_STYLE = {
  background: 'radial-gradient(ellipse at 40% 60%, #1a0a2e 0%, #0a0a14 50%, #0d0d1a 100%)',
}

const PROX_DIST: Record<SceneProximity, number> = {
  adjacent: 1, near: 2, medium: 4, far: 6, distant: -1,
}

const DIR_OFFSET: Record<SceneDirection, [number, number]> = {
  n: [0,-1], ne: [1,-1], e: [1,0], se: [1,1],
  s: [0,1], sw: [-1,1], w: [-1,0], nw: [-1,-1],
  center: [0,0],
}

function objPos(obj: SceneObject): { x: number; y: number } | null {
  const dist = PROX_DIST[obj.proximity]
  if (dist < 0) return null
  const [dx, dy] = DIR_OFFSET[obj.direction] ?? [0, 0]
  return {
    x: Math.max(0, Math.min(GRID_SIZE - 1, PLAYER_POS.x + dx * dist)),
    y: Math.max(0, Math.min(GRID_SIZE - 1, PLAYER_POS.y + dy * dist)),
  }
}

interface Props {
  sceneObjects: SceneObject[]
  backgroundUrl: string
  playerName: string
  playerHp: number
  playerMaxHp: number
}

export function ExplorationMap({ sceneObjects, backgroundUrl, playerName, playerHp, playerMaxHp }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
  }, [backgroundUrl])

  const showFallback = !backgroundUrl || imgError
  const hpPct = Math.max(0, (playerHp / playerMaxHp) * 100)
  const distantObjects = sceneObjects.filter(o => o.proximity === 'distant')
  const visibleObjects = sceneObjects.filter(o => o.proximity !== 'distant')

  // Build a map of pos key → objects for rendering
  const posMap = new Map<string, SceneObject[]>()
  for (const obj of visibleObjects) {
    const pos = objPos(obj)
    if (!pos) continue
    const key = `${pos.x},${pos.y}`
    if (!posMap.has(key)) posMap.set(key, [])
    posMap.get(key)!.push(obj)
  }

  return (
    <div className="flex flex-col">
      {/* Grid */}
      <div
        className="relative overflow-hidden"
        style={{ width: SIZE, height: SIZE, ...(showFallback || !imgLoaded ? FALLBACK_STYLE : {}) }}
      >
        {/* Background */}
        {backgroundUrl && !imgError && (
          <img
            src={backgroundUrl}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${imgLoaded ? 'opacity-45' : 'opacity-0'}`}
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
            const isPlayer = x === PLAYER_POS.x && y === PLAYER_POS.y
            const cellObjs = posMap.get(`${x},${y}`)
            if (isPlayer || cellObjs) return <div key={i} className="border border-white/[0.05]" />
            return <div key={i} className="border border-white/[0.05]" />
          })}
        </div>

        {/* Scene object tokens */}
        {visibleObjects.map(obj => {
          const pos = objPos(obj)
          if (!pos) return null
          return (
            <div
              key={obj.id}
              className="absolute pointer-events-none"
              style={{ left: pos.x * CELL, top: pos.y * CELL, width: CELL, height: CELL }}
            >
              <div
                className="absolute inset-1.5 rounded-lg flex items-center justify-center"
                style={{
                  background: obj.interacted
                    ? 'rgba(60,60,80,0.7)'
                    : 'rgba(15,10,30,0.75)',
                  border: obj.interacted
                    ? '1px solid rgba(100,100,120,0.4)'
                    : '1px solid rgba(120,80,200,0.35)',
                  boxShadow: obj.interacted ? 'none' : '0 0 8px rgba(120,80,200,0.2)',
                }}
              >
                <span
                  className="select-none"
                  style={{
                    fontSize: 16,
                    filter: obj.interacted
                      ? 'grayscale(1) opacity(0.4)'
                      : 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
                  }}
                  title={obj.name}
                >
                  {obj.icon || '❓'}
                </span>
              </div>
            </div>
          )
        })}

        {/* Player token */}
        <div
          className="absolute pointer-events-none"
          style={{ left: PLAYER_POS.x * CELL, top: PLAYER_POS.y * CELL, width: CELL, height: CELL }}
        >
          <div className="absolute inset-1.5 rounded-full flex flex-col items-center justify-center bg-violet-700/90 border-2 border-violet-400 shadow-lg shadow-violet-900/60">
            <span className="text-[11px] font-bold text-white leading-none">
              {playerName.charAt(0).toUpperCase() || '?'}
            </span>
            <span className="text-[8px] text-white/60 font-mono leading-none mt-0.5">{playerHp}</span>
          </div>
          {/* HP bar */}
          <div className="absolute bottom-0.5 left-1.5 right-1.5 h-1.5 bg-black/70 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hpPct}%`,
                background: hpPct > 50 ? '#a78bfa' : hpPct > 25 ? '#fb923c' : '#ef4444',
              }}
            />
          </div>
        </div>

        {/* Subtle vignette for atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 45% 65%, transparent 40%, rgba(5,5,15,0.5) 100%)',
          }}
        />
      </div>

      {/* Distant objects legend */}
      {distantObjects.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[#2d2d4e] space-y-0.5">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Outside vision</p>
          {distantObjects.map(obj => (
            <div key={obj.id} className="flex items-center gap-1.5">
              <span className="text-[11px]" style={{ filter: 'grayscale(1) opacity(0.5)' }}>
                {obj.icon || '👁'}
              </span>
              <span className="text-[10px] text-gray-600 italic">{obj.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
