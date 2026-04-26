import { useState, useEffect } from 'react'
import type { SceneObject, SceneProximity, SceneDirection, Theme } from '../../types/index'

const GRID_SIZE = 8
const CELL = 40
const SIZE = CELL * GRID_SIZE

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

const THEME_STYLE: Record<Theme, string> = {
  dark_fantasy:  'dark fantasy medieval character portrait, painterly, dramatic lighting',
  space_odyssey: 'sci-fi futuristic character portrait, neon lighting, detailed',
  pirate_seas:   'age of sail pirate character portrait, weathered, seafaring',
  horror_manor:  'gothic Victorian horror character portrait, pale, eerie lighting',
  lego_universe: 'lego minifig character, colorful, plastic toy style',
}

function npcPortraitUrl(name: string, theme: Theme): string {
  const style = THEME_STYLE[theme]
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 99999
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(`${name}, ${style}, face close-up, no background, square crop`)}?width=80&height=80&nologo=true&seed=${seed}&model=flux`
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

interface TooltipProps { text: string; children: React.ReactNode }
function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none"
          style={{ whiteSpace: 'nowrap' }}
        >
          <div className="bg-[#0e0e24] border border-[#3d2d6e] text-white text-[10px] px-2 py-1 rounded-md shadow-lg">
            {text}
          </div>
        </div>
      )}
    </div>
  )
}

interface NpcTokenProps {
  obj: SceneObject
  theme: Theme
  cell: number
}
function NpcToken({ obj, theme, cell }: NpcTokenProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const url = npcPortraitUrl(obj.name, theme)

  return (
    <Tooltip text={obj.name}>
      <div
        className="absolute inset-1 rounded-full overflow-hidden border-2 border-violet-500/60 shadow-lg shadow-violet-900/40 cursor-default"
        style={{ background: '#1a0a2e' }}
      >
        {!imgError && (
          <img
            src={url}
            alt={obj.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        {(!imgLoaded || imgError) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: cell * 0.38 }}>{obj.icon || '👤'}</span>
          </div>
        )}
      </div>
    </Tooltip>
  )
}

interface Props {
  sceneObjects: SceneObject[]
  backgroundUrl: string
  playerName: string
  playerHp: number
  playerMaxHp: number
  playerPortrait?: string
  theme: Theme
}

export function ExplorationMap({
  sceneObjects,
  backgroundUrl,
  playerName,
  playerHp,
  playerMaxHp,
  playerPortrait,
  theme,
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [playerImgLoaded, setPlayerImgLoaded] = useState(false)

  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
  }, [backgroundUrl])

  const showFallback = !backgroundUrl || imgError
  const hpPct = Math.max(0, (playerHp / playerMaxHp) * 100)
  const distantObjects = sceneObjects.filter(o => o.proximity === 'distant')
  const visibleObjects = sceneObjects.filter(o => o.proximity !== 'distant')

  // Build pos map — objects at same cell stack (show topmost)
  const posMap = new Map<string, SceneObject>()
  for (const obj of visibleObjects) {
    const pos = objPos(obj)
    if (!pos) continue
    const key = `${pos.x},${pos.y}`
    if (!posMap.has(key)) posMap.set(key, obj)
  }

  return (
    <div className="flex flex-col w-full">
      {/* Grid */}
      <div
        className="relative overflow-hidden w-full"
        style={{
          height: SIZE,
          maxWidth: SIZE,
          margin: '0 auto',
          ...(showFallback || !imgLoaded ? FALLBACK_STYLE : {}),
        }}
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

        {/* Grid lines */}
        <div
          className="absolute inset-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL}px)`,
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => (
            <div key={i} className="border border-white/[0.05]" />
          ))}
        </div>

        {/* Scene object tokens */}
        {Array.from(posMap.entries()).map(([key, obj]) => {
          const [x, y] = key.split(',').map(Number)
          const isNpc = obj.type === 'npc'
          return (
            <div
              key={obj.id}
              className="absolute pointer-events-auto"
              style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
            >
              {isNpc ? (
                <NpcToken obj={obj} theme={theme} cell={CELL} />
              ) : (
                <Tooltip text={`${obj.name}${obj.type === 'exit' ? ' (exit)' : ''}`}>
                  <div
                    className="absolute inset-1.5 rounded-lg flex items-center justify-center cursor-default"
                    style={{
                      background: obj.interacted
                        ? 'rgba(40,40,60,0.65)'
                        : obj.type === 'exit'
                        ? 'rgba(10,20,40,0.75)'
                        : 'rgba(15,10,30,0.75)',
                      border: obj.interacted
                        ? '1px solid rgba(80,80,100,0.35)'
                        : obj.type === 'exit'
                        ? '1px solid rgba(80,140,220,0.4)'
                        : '1px solid rgba(120,80,200,0.35)',
                      boxShadow: obj.interacted ? 'none'
                        : obj.type === 'exit'
                        ? '0 0 8px rgba(80,140,220,0.2)'
                        : '0 0 8px rgba(120,80,200,0.2)',
                    }}
                  >
                    <span
                      className="select-none"
                      style={{
                        fontSize: 17,
                        filter: obj.interacted
                          ? 'grayscale(1) opacity(0.35)'
                          : 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
                      }}
                    >
                      {obj.icon || '❓'}
                    </span>
                  </div>
                </Tooltip>
              )}
            </div>
          )
        })}

        {/* Player token */}
        <Tooltip text={`${playerName} — ${playerHp}/${playerMaxHp} HP`}>
          <div
            className="absolute pointer-events-auto"
            style={{ left: PLAYER_POS.x * CELL, top: PLAYER_POS.y * CELL, width: CELL, height: CELL }}
          >
            <div className="absolute inset-1 rounded-full overflow-hidden border-2 border-violet-400 shadow-lg shadow-violet-900/60 bg-violet-800">
              {playerPortrait && !playerImgLoaded ? null : null}
              {playerPortrait ? (
                <img
                  src={playerPortrait}
                  alt={playerName}
                  className="w-full h-full object-cover"
                  onLoad={() => setPlayerImgLoaded(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-violet-700/90">
                  <span className="text-[11px] font-bold text-white leading-none">
                    {playerName.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            {/* HP bar */}
            <div className="absolute bottom-0.5 left-1.5 right-1.5 h-1 bg-black/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${hpPct}%`,
                  background: hpPct > 50 ? '#a78bfa' : hpPct > 25 ? '#fb923c' : '#ef4444',
                }}
              />
            </div>
          </div>
        </Tooltip>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 45% 65%, transparent 40%, rgba(5,5,15,0.5) 100%)' }}
        />
      </div>

      {/* Distant objects legend */}
      {distantObjects.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[#2d2d4e] space-y-0.5">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Outside vision</p>
          {distantObjects.map(obj => (
            <div key={obj.id} className="flex items-center gap-1.5">
              <span className="text-[11px]" style={{ filter: 'grayscale(1) opacity(0.45)' }}>
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
