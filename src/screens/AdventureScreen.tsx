import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, Swords, Cloud, CloudOff, House, MessageSquare, UserRound, Compass } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { useClaude } from '../hooks/useClaude'
import { useSupabase } from '../hooks/useSupabase'
import { useCombatGrid } from '../hooks/useCombatGrid'
import { parseAIResponse } from '../utils/parseAIResponse'
import { CharacterPanel } from '../components/character/CharacterPanel'
import { StoryPanel } from '../components/adventure/StoryPanel'
import { InputBar } from '../components/adventure/InputBar'
import { QuickActions } from '../components/story/QuickActions'
import { CombatGrid } from '../components/combat/CombatGrid'
import { ExplorationMap } from '../components/exploration/ExplorationMap'
import { DiceRoller } from '../components/combat/DiceRoller'
import { DiceOverlay } from '../components/combat/DiceOverlay'
import { TokenBadge } from '../components/ui/TokenBadge'
import { KidsModeBadge } from '../components/ui/KidsModeBadge'
import { SettingsScreen } from './SettingsScreen'
import type { Combatant, Theme, StatKey } from '../types/index'
import type { DiceRoll, GridUnit, GridObstacle } from '../hooks/useCombatGrid'
import { hasCover } from '../hooks/useCombatGrid'

const THEME_LABELS: Record<string, string> = {
  dark_fantasy: '⚔️ Dark Fantasy',
  space_odyssey: '🚀 Space Odyssey',
  pirate_seas: '🏴‍☠️ Pirate Seas',
  horror_manor: '🕯️ Horror Manor',
  lego_universe: '🧱 Lego Universe',
}

const ENEMY_NAMES: Record<Theme, string[]> = {
  dark_fantasy: ['Goblin Scout', 'Skeleton Warrior', 'Dark Cultist'],
  space_odyssey: ['Patrol Drone', 'Alien Guard', 'Security Bot'],
  pirate_seas: ['Cutthroat', 'Sea Raider', 'Buccaneer'],
  horror_manor: ['Shadow Wraith', 'Undead Servant', 'Ghoul'],
  lego_universe: ['Brick Bandit', 'Minifig Thug', 'Chaos Builder'],
}

const THEME_ART_STYLE: Record<Theme, string> = {
  dark_fantasy: 'dark grim medieval fantasy painting',
  space_odyssey: 'sci-fi futuristic illustration',
  pirate_seas: 'age of sail nautical illustration',
  horror_manor: 'gothic Victorian horror art',
  lego_universe: 'colorful lego brick cartoon',
}

function locationScene(location: string): string {
  const l = location.toLowerCase()
  if (/tavern|inn|pub|bar|alehouse|saloon/.test(l))
    return 'tavern interior overhead, wooden floor, round tables, stools, bar counter, barrels, fireplace, candlelight'
  if (/dungeon|crypt|cellar|vault|prison|cell/.test(l))
    return 'dungeon stone corridor overhead, torches, iron bars, pillars, rubble, puddles'
  if (/forest|wood|grove|thicket|jungle|glade/.test(l))
    return 'forest clearing overhead, tree roots, fallen logs, mossy stones, undergrowth, dappled light'
  if (/cave|cavern|grotto|mine|tunnel/.test(l))
    return 'cave interior overhead, stalactites shadow, stone floor, underground pool, crystal veins'
  if (/street|alley|market|plaza|square|town/.test(l))
    return 'cobblestone street overhead, market stalls, crates, barrels, lamp posts, shadows'
  if (/castle|throne|great hall|palace|keep|fortress/.test(l))
    return 'castle great hall overhead, stone floor, pillars, throne dais, tapestries, torches'
  if (/ship|deck|vessel|boat|galleon/.test(l))
    return 'ship deck overhead, wooden planks, ropes, cannons, cargo crates, mast base'
  if (/library|study|lab|workshop|laboratory/.test(l))
    return 'stone room overhead, bookshelves along walls, large table, scattered papers, candles'
  if (/temple|church|shrine|altar|cathedral/.test(l))
    return 'temple interior overhead, stone floor, central altar, pillars, candles, pews'
  if (/swamp|marsh|bog|fen/.test(l))
    return 'swamp overhead, murky water patches, mud, twisted roots, hanging moss, fog'
  if (/beach|shore|coast|dock|pier|harbor/.test(l))
    return 'harbor dock overhead, wooden planks, rope coils, crates, water edge, bollards'
  if (/mountain|cliff|peak|ridge/.test(l))
    return 'mountain ledge overhead, rocky ground, boulders, narrow path, drop edge'
  return `${location.substring(0, 50)} interior overhead view, detailed floor, obstacles, furniture`
}

function buildMapUrl(location: string, theme: Theme): string {
  const style = THEME_ART_STYLE[theme]
  const scene = locationScene(location)
  const prompt = `tactical battlemap overhead top-down, ${scene}, ${style}, no characters, no grid lines, detailed environment, ambient lighting`
  const seed = Math.floor(Math.random() * 99999)
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=320&height=320&nologo=true&seed=${seed}&model=flux`
}

function buildGridContext(units: GridUnit[], obstacles: GridObstacle[]): string {
  const player = units.find(u => u.isPlayer && u.hp > 0)
  if (!player) return '[GRID STATE: no player]'
  const cover = hasCover(player.pos, obstacles)
  const coverStr = cover ? 'IN-HALF-COVER(+2AC)' : 'EXPOSED'
  const parts: string[] = [`Player(${player.pos.x},${player.pos.y}) HP:${player.hp}/${player.maxHp} ${coverStr}`]
  const enemies = units.filter(u => !u.isPlayer && u.hp > 0)
  for (const e of enemies) {
    const dist = Math.max(Math.abs(e.pos.x - player.pos.x), Math.abs(e.pos.y - player.pos.y))
    parts.push(`${e.name}(${e.pos.x},${e.pos.y}) HP:${e.hp}/${e.maxHp} ${dist}sq`)
  }
  const dead = units.filter(u => !u.isPlayer && u.hp <= 0)
  if (dead.length > 0) parts.push(`Defeated:${dead.map(e => e.name).join(',')}`)
  if (obstacles.length > 0) parts.push(`Obstacles:${obstacles.map(o => `(${o.x},${o.y})`).join(',')}`)
  return `[GRID STATE: ${parts.join(' | ')}]`
}

function generateEnemies(theme: Theme, count: number): Combatant[] {
  const names = ENEMY_NAMES[theme]
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    name: names[i % names.length]!,
    isPlayer: false,
    hp: 8 + Math.floor(Math.random() * 5),
    maxHp: 12,
    ac: 11,
    initiative: Math.floor(Math.random() * 20) + 1,
    isDefeated: false,
  }))
}

interface AdventureScreenProps {
  onEndCampaign: () => void
}

export function AdventureScreen({ onEndCampaign }: AdventureScreenProps) {
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [confirmHome, setConfirmHome] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [rolls, setRolls] = useState<DiceRoll[]>([])
  const [latestRoll, setLatestRoll] = useState<DiceRoll | null>(null)
  const [mapUrl, setMapUrl] = useState('')
  const [combatLog, setCombatLog] = useState<string[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [mobileTab, setMobileTab] = useState<'chat' | 'character' | 'map'>('chat')
  const [mobileMapSize, setMobileMapSize] = useState(() => window.innerWidth)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locationMapCache = useRef<Map<string, string>>(new Map())
  const hasAutoStarted = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, width: 0 })
  const prevLocationRef = useRef<string>('')
  const prevInCombatRef = useRef(false)
  const lastReadRef = useRef(0)

  const game = useGameStore()
  const { kidsMode } = useSettingsStore()
  const { sendMessage, sendNarration, isLoading, error } = useClaude()
  const { isConfigured, isSaving, saveCurrentCampaign } = useSupabase()

  const handleRoll = useCallback((roll: DiceRoll) => {
    setRolls(prev => [...prev, roll])
    setLatestRoll(roll)
  }, [])

  const handleAction = useCallback((text: string) => {
    setCombatLog(prev => [...prev.slice(-19), text])
  }, [])

  const handleCombatEnd = useCallback((victory: boolean, finalUnits: GridUnit[]) => {
    game.endCombat()
    for (const unit of finalUnits) {
      if (unit.isPlayer) {
        const stored = game.players.find(p => p.id === unit.id)
        if (stored && unit.hp !== stored.hp) {
          game.updatePlayerHP(unit.id, unit.hp - stored.hp)
        }
      }
    }
    const msg = victory
      ? 'Victory! Your enemies lie defeated.'
      : 'You have fallen in battle... The darkness claims you.'
    game.appendMessage('assistant', msg)
  }, [game])

  // Capture obstacles ref for use in onAttackDone (obstacles don't change during combat)
  const obstaclesRef = useRef<GridObstacle[]>([])

  const handleAttackDone = useCallback((targetName: string, hit: boolean, damage: number, snapshot: GridUnit[]) => {
    const result = hit ? `Hit! ${damage} damage dealt` : 'Miss!'
    const gridCtx = buildGridContext(snapshot, obstaclesRef.current)
    const context = `[COMBAT RESULT: You attacked ${targetName} — ${result}]\n${gridCtx}`
    sendNarration(context)
  }, [sendNarration])

  const {
    units,
    obstacles,
    phase: gridPhase,
    playerMoved,
    playerAttacked,
    playerDodging,
    validMoves,
    validTargets,
    initGrid,
    handleCellClick,
    handleEnemyClick,
    handleDodge,
    endPlayerTurn,
  } = useCombatGrid(handleRoll, handleCombatEnd, handleAction, handleAttackDone)

  const combat = game.combatState
  const inCombat = combat?.active ?? false

  // Keep obstaclesRef in sync
  useEffect(() => {
    obstaclesRef.current = obstacles
  }, [obstacles])

  // Sidebar resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = dragStartRef.current.x - e.clientX
      setSidebarWidth(Math.max(200, Math.min(560, dragStartRef.current.width + delta)))
    }
    const onUp = () => { isDraggingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Notify player when location changes during combat
  useEffect(() => {
    const loc = game.currentLocation
    if (!loc) return
    if (prevLocationRef.current && prevLocationRef.current !== loc) {
      game.appendMessage('assistant', `📍 Location changed: **${loc}**`)
    }
    prevLocationRef.current = loc
  }, [game.currentLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate exploration map when location changes (cached per location)
  useEffect(() => {
    if (!game.currentLocation || !game.theme || inCombat) return
    const key = `${game.currentLocation}::${game.theme}`
    if (!locationMapCache.current.has(key)) {
      locationMapCache.current.set(key, buildMapUrl(game.currentLocation, game.theme))
    }
    setMapUrl(locationMapCache.current.get(key)!)
  }, [game.currentLocation, game.theme, inCombat])

  // Auto-save 3s after last message lands
  const messageCount = game.messages.length
  useEffect(() => {
    if (!isConfigured() || messageCount === 0) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      await saveCurrentCampaign()
      setLastSaved(new Date())
    }, 3000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [messageCount])

  // Mobile: track window width for map sizing
  useEffect(() => {
    const update = () => setMobileMapSize(window.innerWidth)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Mobile: auto-switch tabs on combat state transitions
  useEffect(() => {
    if (inCombat && !prevInCombatRef.current) setMobileTab('map')
    if (!inCombat && prevInCombatRef.current) setMobileTab('chat')
    prevInCombatRef.current = inCombat
  }, [inCombat])

  // Mobile: unread message badge on chat tab
  useEffect(() => {
    if (mobileTab === 'chat') {
      lastReadRef.current = game.messages.length
      setUnreadMessages(0)
    } else {
      setUnreadMessages(Math.max(0, game.messages.length - lastReadRef.current))
    }
  }, [game.messages.length, mobileTab])

  // On resume: combat grid state is not persisted — clear stale combat flag
  useEffect(() => {
    if (game.combatState?.active) {
      game.endCombat()
      game.appendMessage('assistant', '⚔️ Your previous battle was interrupted. You regroup and continue.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send opening scene when adventure begins fresh
  useEffect(() => {
    if (hasAutoStarted.current) return
    if (game.messages.length > 0 || !game.theme || game.players.length === 0) return
    hasAutoStarted.current = true
    const t = setTimeout(() => {
      handleSend('Begin the adventure. Describe where I am and what I see, hear, and smell around me.')
    }, 300)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (text: string) => {
    setQuickActions([])
    try {
      const gridCtx = inCombat ? `${buildGridContext(units, obstacles)} ` : ''
      const messageText = inCombat
        ? `[COMBAT ACTIVE] ${gridCtx}${text}`
        : text
      const rawResponse = await sendMessage(messageText)
      const parsed = parseAIResponse(rawResponse)
      if (parsed.actions.length > 0) setQuickActions(parsed.actions)

      // ── Skill check ──────────────────────────────────────────────────────
      if (parsed.skillCheck) {
        const { skill, stat, dc } = parsed.skillCheck
        const player = game.players[0]
        const statValue = player?.stats[stat as StatKey] ?? 10
        const mod = Math.floor((statValue - 10) / 2)
        const die = Math.floor(Math.random() * 20) + 1
        const total = die + mod
        const success = total >= dc
        const roll: DiceRoll = {
          key: Date.now(),
          label: `${skill} (DC ${dc})`,
          sides: 20,
          values: [die],
          total,
          isHit: success,
          dc,
        }
        setRolls(prev => [...prev, roll])
        setLatestRoll(roll)
        const modStr = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : ''
        const resultText = `${skill} check: rolled ${die}${modStr} = ${total} vs DC ${dc} — ${success ? 'Success!' : 'Failure.'}`
        setTimeout(() => handleSend(resultText), 1400)
        return
      }

      if (parsed.combatStart && !inCombat) {
        const theme = game.theme ?? 'dark_fantasy'
        const enemyCount = Math.max(1, Math.min(game.players.length + 1, 3))
        const enemyCombatants = generateEnemies(theme, enemyCount)
        const playerCombatants: Combatant[] = game.players.map(p => ({
          id: p.id,
          name: p.name,
          isPlayer: true,
          hp: p.hp,
          maxHp: p.maxHp,
          ac: p.ac,
          initiative: Math.floor(Math.random() * 20) + 1,
          isDefeated: false,
        }))
        game.startCombat(enemyCombatants)
        initGrid([...playerCombatants, ...enemyCombatants])
        // Reuse cached exploration map for combat (same location)
        const combatMapKey = `${game.currentLocation}::${theme}`
        if (!locationMapCache.current.has(combatMapKey)) {
          locationMapCache.current.set(combatMapKey, buildMapUrl(game.currentLocation, theme))
        }
        setMapUrl(locationMapCache.current.get(combatMapKey)!)
        setRolls([])
        setCombatLog([])
      }
    } catch {
      // error shown via useClaude error state
    }
  }

  const handleQuickAction = (action: string) => handleSend(action)

  // Safety: ensure combat sidebar closes if grid phase finishes but store didn't update
  useEffect(() => {
    if (gridPhase === 'done' && inCombat) {
      const t = setTimeout(() => game.endCombat(), 1200)
      return () => clearTimeout(t)
    }
  }, [gridPhase, inCombat])

  // ── Shared sub-panels ────────────────────────────────────────────────────
  const playerCoverActive = (() => {
    const pl = units.find(u => u.isPlayer && u.hp > 0)
    return pl ? hasCover(pl.pos, obstacles) : false
  })()

  const mapHeader = (
    <div className="px-3 py-2 border-b border-[#2d2d4e] flex items-center justify-between shrink-0">
      {inCombat ? (
        <>
          <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Battle</span>
          <div className="flex items-center gap-2">
            {playerCoverActive && (
              <span className="text-[10px] text-sky-400 flex items-center gap-1 border border-sky-800/40 bg-sky-900/20 px-1.5 py-0.5 rounded-full">
                🛡 Cover +2
              </span>
            )}
            <span className="text-xs font-mono text-red-400">Round {combat?.round ?? 1}</span>
          </div>
        </>
      ) : (
        <>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Scene</span>
          <span className="text-[10px] text-gray-600 truncate max-w-40">{game.currentLocation}</span>
        </>
      )}
    </div>
  )

  const combatActionPanel = inCombat ? (
    <>
      <div className="shrink-0 border-t border-[#2d2d4e] px-3 pt-2.5 pb-2">
        {gridPhase === 'player' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className={`w-2 h-2 rounded-full ${playerMoved ? 'bg-gray-700' : 'bg-emerald-500'}`} />
              <span className={playerMoved ? 'line-through text-gray-700' : 'text-gray-400'}>Movement</span>
              <span className="mx-1 text-[#2d2d4e]">·</span>
              <span className={`w-2 h-2 rounded-full ${playerAttacked ? 'bg-gray-700' : 'bg-orange-500'}`} />
              <span className={playerAttacked ? 'line-through text-gray-700' : 'text-gray-400'}>Action</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleDodge}
                disabled={playerAttacked}
                className={[
                  'flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-[11px] font-medium transition-all',
                  playerDodging
                    ? 'bg-sky-900/30 border-sky-500 text-sky-300'
                    : 'bg-[#1a1a2e] border-[#2d2d4e] text-gray-400 hover:border-sky-800 disabled:opacity-30 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                <span>🛡</span><span>Dodge</span>
              </button>
              <button
                onClick={endPlayerTurn}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium bg-[#1a1a2e] hover:bg-[#252540] border border-[#2d2d4e] text-gray-500 hover:text-gray-300 rounded-xl transition-colors"
              >
                <span>→</span><span>End Turn</span>
              </button>
            </div>
            {validTargets.length > 0 && !playerAttacked && (
              <p className="text-[10px] text-yellow-400/70 text-center">Enemy in range — tap to attack</p>
            )}
          </div>
        )}
        {gridPhase === 'enemy' && (
          <div className="flex items-center gap-2 py-2 text-xs text-red-400">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Enemy thinking...
          </div>
        )}
        {gridPhase === 'done' && (
          <div className="text-center text-xs text-gray-500 py-2">Combat ended</div>
        )}
      </div>
      {rolls.length > 0 && (
        <div className="shrink-0 border-t border-[#2d2d4e] overflow-y-auto" style={{ maxHeight: 120 }}>
          <DiceRoller rolls={rolls} />
        </div>
      )}
      {combatLog.length > 0 && (
        <div className="shrink-0 border-t border-[#2d2d4e] px-3 py-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: 80 }}>
          {combatLog.slice(-5).map((entry, i) => {
            const isPlayer = entry.startsWith('You')
            const isHit = entry.includes('Hit') || entry.includes('damage')
            const isMiss = entry.includes('Miss') || entry.includes('Dodge')
            return (
              <p key={i} className={['text-[11px] leading-snug', isPlayer ? 'text-violet-300' : isMiss ? 'text-gray-500' : isHit ? 'text-red-400' : 'text-gray-400'].join(' ')}>
                {entry}
              </p>
            )
          })}
        </div>
      )}
    </>
  ) : null

  const sceneObjectList = !inCombat && game.sceneObjects && game.sceneObjects.filter(o => o.proximity !== 'distant').length > 0 ? (
    <div className="shrink-0 border-t border-[#2d2d4e] px-3 py-2">
      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Visible</p>
      <div className="flex flex-wrap gap-1.5">
        {game.sceneObjects.filter(o => o.proximity !== 'distant').map(obj => (
          <div key={obj.id} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span>{obj.icon}</span>
            <span className={obj.interacted ? 'line-through text-gray-700' : ''}>{obj.name}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null

  const errorBanner = error ? (
    <div className="mx-4 mt-3 px-4 py-2.5 bg-red-900/30 border border-red-800/40 rounded-xl text-red-300 text-sm shrink-0">
      {error}
    </div>
  ) : null

  // ── Shared top header ─────────────────────────────────────────────────────
  return (
    <div className="h-dvh flex flex-col bg-[#0f0f1a] overflow-hidden">
      <DiceOverlay latestRoll={latestRoll} />

      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#2d2d4e] bg-[#0f0f1a]/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {confirmHome ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">End campaign?</span>
              <button onClick={() => setConfirmHome(false)} className="text-xs text-gray-500 hover:text-gray-300 px-1.5">Cancel</button>
              <button onClick={onEndCampaign} className="text-xs text-red-400 hover:text-red-300 font-medium px-1.5">End</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmHome(true)}
                aria-label="Return to home"
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                <House size={15} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-semibold text-sm">QuestForge</span>
                  {inCombat && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-900/40 border border-red-800/40 text-red-400 text-[10px] font-medium">
                      <Swords size={9} />
                      <span className="hidden sm:inline">Combat</span>
                    </span>
                  )}
                </div>
                {game.currentLocation && (
                  <p className="text-[10px] text-gray-600 truncate leading-none mt-0.5">{game.currentLocation}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isConfigured() && (
            <div className="flex items-center gap-1 text-xs text-gray-500" title={lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Not saved'}>
              {isSaving
                ? <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
                : lastSaved ? <Cloud size={13} className="text-green-500" /> : <CloudOff size={13} />}
            </div>
          )}
          {kidsMode && <KidsModeBadge />}
          <TokenBadge />
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ── MOBILE LAYOUT (< lg) ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:hidden">
        {/* Tab content */}
        <div className="flex-1 min-h-0 relative">

          {/* STORY TAB */}
          {mobileTab === 'chat' && (
            <div className="h-full flex flex-col">
              {errorBanner}
              <StoryPanel messages={game.messages} />
              {!inCombat && <QuickActions actions={quickActions} onAction={handleQuickAction} isLoading={isLoading} />}
              <InputBar onSend={handleSend} isLoading={isLoading} />
            </div>
          )}

          {/* CHARACTER TAB */}
          {mobileTab === 'character' && (
            <div className="h-full overflow-y-auto">
              <CharacterPanel characters={game.players} quests={game.quests} npcs={game.npcs} />
            </div>
          )}

          {/* MAP TAB */}
          {mobileTab === 'map' && (
            <div className="h-full flex flex-col overflow-y-auto">
              {mapHeader}
              <div className="shrink-0 flex justify-center bg-[#0a0a14]">
                {inCombat ? (
                  <CombatGrid
                    units={units} obstacles={obstacles} validMoves={validMoves}
                    validTargets={validTargets} playerDodging={playerDodging}
                    onCellClick={handleCellClick} onEnemyClick={handleEnemyClick}
                    backgroundUrl={mapUrl} theme={game.theme ?? 'dark_fantasy'}
                    mapSize={Math.min(mobileMapSize, 440)}
                  />
                ) : (
                  <ExplorationMap
                    sceneObjects={game.sceneObjects ?? []} backgroundUrl={mapUrl}
                    playerName={game.players[0]?.name ?? '?'}
                    playerHp={game.players[0]?.hp ?? 0} playerMaxHp={game.players[0]?.maxHp ?? 1}
                    playerPortrait={game.players[0]?.portraitUrl}
                    theme={game.theme ?? 'dark_fantasy'} mapSize={Math.min(mobileMapSize, 440)}
                  />
                )}
              </div>
              {combatActionPanel}
              {sceneObjectList}
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <nav
          className="shrink-0 flex items-stretch border-t border-[#2d2d4e] bg-[#0a0a14]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {(
            [
              { tab: 'chat' as const, icon: MessageSquare, label: 'Story', badge: unreadMessages > 0 ? unreadMessages : 0 },
              { tab: 'character' as const, icon: UserRound, label: 'Character', badge: 0 },
              { tab: 'map' as const, icon: Compass, label: 'Map', badge: 0, alert: inCombat && mobileTab !== 'map' },
            ] as const
          ).map(({ tab, icon: Icon, label, badge, alert }) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={[
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors',
                mobileTab === tab ? 'text-violet-400' : 'text-gray-600 hover:text-gray-400',
              ].join(' ')}
            >
              {mobileTab === tab && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full" />
              )}
              <div className="relative">
                <Icon size={20} strokeWidth={mobileTab === tab ? 2 : 1.5} />
                {(badge > 0 || alert) && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                    {badge > 0 ? (badge > 9 ? '9+' : badge) : ''}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── DESKTOP LAYOUT (≥ lg) ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 hidden lg:flex">
        {/* Left sidebar — Character panel */}
        <aside className="w-64 shrink-0 border-r border-[#2d2d4e] flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CharacterPanel characters={game.players} quests={game.quests} npcs={game.npcs} />
          </div>
        </aside>

        {/* Center — Story */}
        <main className="flex-1 flex flex-col min-w-0">
          {errorBanner}
          <StoryPanel messages={game.messages} />
          {!inCombat && <QuickActions actions={quickActions} onAction={handleQuickAction} isLoading={isLoading} />}
          <InputBar onSend={handleSend} isLoading={isLoading} />
        </main>

        {/* Drag handle */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-[#2d2d4e] hover:bg-violet-600/40 transition-colors active:bg-violet-500/60 select-none"
          onMouseDown={(e) => {
            isDraggingRef.current = true
            dragStartRef.current = { x: e.clientX, width: sidebarWidth }
            e.preventDefault()
          }}
        />

        {/* Right sidebar — map */}
        <aside className="shrink-0 border-l border-[#2d2d4e] flex flex-col overflow-hidden" style={{ width: sidebarWidth }}>
          {mapHeader}
          <div className="flex-1 flex flex-col items-center overflow-y-auto">
            {inCombat ? (
              <CombatGrid
                units={units} obstacles={obstacles} validMoves={validMoves}
                validTargets={validTargets} playerDodging={playerDodging}
                onCellClick={handleCellClick} onEnemyClick={handleEnemyClick}
                backgroundUrl={mapUrl} theme={game.theme ?? 'dark_fantasy'} mapSize={sidebarWidth}
              />
            ) : (
              <ExplorationMap
                sceneObjects={game.sceneObjects ?? []} backgroundUrl={mapUrl}
                playerName={game.players[0]?.name ?? '?'}
                playerHp={game.players[0]?.hp ?? 0} playerMaxHp={game.players[0]?.maxHp ?? 1}
                playerPortrait={game.players[0]?.portraitUrl}
                theme={game.theme ?? 'dark_fantasy'} mapSize={sidebarWidth}
              />
            )}
          </div>
          {combatActionPanel}
          {sceneObjectList}
        </aside>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          onEndCampaign={() => { setShowSettings(false); onEndCampaign() }}
        />
      )}
    </div>
  )
}
