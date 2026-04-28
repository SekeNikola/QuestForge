import { useState, useCallback, useRef } from 'react'
import type { Combatant } from '../types/index'

export interface GridPos { x: number; y: number }

export interface GridUnit {
  id: string
  name: string
  isPlayer: boolean
  pos: GridPos
  hp: number
  maxHp: number
  speed: number
  atkRange: number
}

export interface GridObstacle {
  x: number
  y: number
  icon: string
  name?: string
}

export type CombatPhase = 'idle' | 'player' | 'enemy' | 'done'

export interface DiceRoll {
  key: number
  label: string
  sides: number
  values: number[]
  total: number
  isHit?: boolean
  dc?: number
}

export const GRID_SIZE = 8
const BASE_HIT_DC = 9   // enemy needs d20 ≥ 9 to hit player (AC 10 baseline)
const HALF_COVER_BONUS = 2  // +2 to effective hit DC when player is in half cover

const cheby = (a: GridPos, b: GridPos) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
const manh  = (a: GridPos, b: GridPos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const inBounds = (p: GridPos) => p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE

const blocked = (us: GridUnit[], obs: GridObstacle[], p: GridPos, skip?: string) =>
  us.some(u => u.hp > 0 && u.id !== skip && u.pos.x === p.x && u.pos.y === p.y) ||
  obs.some(o => o.x === p.x && o.y === p.y)

const rollD = (sides: number) => Math.floor(Math.random() * sides) + 1

// Half cover: player orthogonally adjacent to an obstacle
export function hasCover(pos: GridPos, obs: GridObstacle[]): boolean {
  return obs.some(o => manh(pos, { x: o.x, y: o.y }) === 1)
}

// Generate random obstacles for the middle band of the map
function generateObstacles(): GridObstacle[] {
  const obstacles: Array<{ icon: string; name: string }> = [
    { icon: '🪨', name: 'Rock' },
    { icon: '🛢', name: 'Barrel' },
    { icon: '📦', name: 'Crate' },
    { icon: '🪵', name: 'Log' },
    { icon: '⬛', name: 'Pillar' },
  ]
  const count = 4 + Math.floor(Math.random() * 3)  // 4–6
  const result: GridObstacle[] = []
  let attempts = 0
  while (result.length < count && attempts < 60) {
    attempts++
    const x = 2 + Math.floor(Math.random() * 4)  // 2–5
    const y = 1 + Math.floor(Math.random() * 6)  // 1–6
    // Keep away from player spawn (bottom-left) and enemy spawn (top-right)
    if (x <= 1 || x >= 6) continue
    if ((x <= 1 && y >= 6) || (x >= 6 && y <= 1)) continue
    if (result.some(o => o.x === x && o.y === y)) continue
    const obs = obstacles[Math.floor(Math.random() * obstacles.length)]!
    result.push({ x, y, icon: obs.icon, name: obs.name })
  }
  return result
}

export function useCombatGrid(
  onRoll: (r: DiceRoll) => void,
  onCombatEnd: (victory: boolean, finalUnits: GridUnit[]) => void,
  onAction?: (text: string) => void,
  onAttackDone?: (targetName: string, hit: boolean, damage: number, snapshot: GridUnit[]) => void,
) {
  const keyRef           = useRef(0)
  const unitsRef         = useRef<GridUnit[]>([])
  const obstaclesRef     = useRef<GridObstacle[]>([])
  const playerDodgingRef = useRef(false)

  const [units, _setUnits]               = useState<GridUnit[]>([])
  const [obstacles, _setObstacles]       = useState<GridObstacle[]>([])
  const [phase, setPhase]                = useState<CombatPhase>('idle')
  const [playerMoved, setPlayerMoved]    = useState(false)
  const [playerAttacked, setPlayerAttacked] = useState(false)
  const [playerDodging, _setPlayerDodging]  = useState(false)
  const [validMoves, setValidMoves]      = useState<GridPos[]>([])
  const [validTargets, setValidTargets]  = useState<string[]>([])

  const setUnits = useCallback((fn: GridUnit[] | ((p: GridUnit[]) => GridUnit[])) => {
    const next = typeof fn === 'function' ? fn(unitsRef.current) : fn
    unitsRef.current = next
    _setUnits(next)
  }, [])

  const setObstacles = (obs: GridObstacle[]) => {
    obstaclesRef.current = obs
    _setObstacles(obs)
  }

  const setPlayerDodging = (v: boolean) => {
    playerDodgingRef.current = v
    _setPlayerDodging(v)
  }

  const fireRoll = useCallback((label: string, sides: number, count = 1, hitDcOverride?: number): DiceRoll => {
    const values = Array.from({ length: count }, () => rollD(sides))
    const total  = values.reduce((a, b) => a + b, 0)
    const r: DiceRoll = { key: ++keyRef.current, label, sides, values, total }
    if (sides === 20) {
      const dc = hitDcOverride ?? BASE_HIT_DC
      r.isHit = total >= dc
      r.dc    = dc
    }
    onRoll(r)
    return r
  }, [onRoll])

  const computeMoves = (unit: GridUnit, all: GridUnit[], obs: GridObstacle[]): GridPos[] => {
    const moves: GridPos[] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const d = manh(unit.pos, { x, y })
        if (d === 0 || d > unit.speed) continue
        if (blocked(all, obs, { x, y }, unit.id)) continue
        moves.push({ x, y })
      }
    }
    return moves
  }

  const computeTargets = (attacker: GridUnit, all: GridUnit[]): string[] =>
    all.filter(u => u.hp > 0 && u.isPlayer !== attacker.isPlayer && cheby(attacker.pos, u.pos) <= attacker.atkRange).map(u => u.id)

  const refreshHighlights = useCallback((all: GridUnit[], moved: boolean, attacked: boolean) => {
    const player = all.find(u => u.isPlayer && u.hp > 0)
    if (!player) { setValidMoves([]); setValidTargets([]); return }
    setValidMoves(moved ? [] : computeMoves(player, all, obstaclesRef.current))
    setValidTargets(attacked ? [] : computeTargets(player, all))
  }, [])

  const initGrid = useCallback((combatants: Combatant[]) => {
    // Randomly pick starting corners so the layout isn't always the same.
    // 0 = players bottom-left, enemies top-right  (classic)
    // 1 = players bottom-right, enemies top-left
    // 2 = players top-left, enemies bottom-right
    // 3 = players top-right, enemies bottom-left
    const corner = Math.floor(Math.random() * 4)
    let pi = 0, ei = 0
    const placed: GridUnit[] = combatants.map(c => {
      let pos: GridPos
      if (c.isPlayer) {
        const col = pi % 2, row = Math.floor(pi / 2)
        if (corner === 0) pos = { x: col, y: GRID_SIZE - 1 - row }
        else if (corner === 1) pos = { x: GRID_SIZE - 1 - col, y: GRID_SIZE - 1 - row }
        else if (corner === 2) pos = { x: col, y: row }
        else pos = { x: GRID_SIZE - 1 - col, y: row }
        pi++
      } else {
        const col = ei % 2, row = Math.floor(ei / 2)
        if (corner === 0) pos = { x: GRID_SIZE - 1 - col, y: row }
        else if (corner === 1) pos = { x: col, y: row }
        else if (corner === 2) pos = { x: GRID_SIZE - 1 - col, y: GRID_SIZE - 1 - row }
        else pos = { x: col, y: GRID_SIZE - 1 - row }
        ei++
      }
      return { id: c.id, name: c.name, isPlayer: c.isPlayer, pos, hp: c.hp, maxHp: c.maxHp, speed: c.isPlayer ? 4 : 3, atkRange: 1 }
    })
    const obs = generateObstacles()
    setObstacles(obs)
    setUnits(placed)
    setPlayerMoved(false)
    setPlayerAttacked(false)
    setPlayerDodging(false)
    setPhase('player')
    refreshHighlights(placed, false, false)
  }, [setUnits, refreshHighlights])

  // Force-end the grid without a natural win/loss (flee, surrender, etc.)
  const forfeit = useCallback(() => {
    setPhase('done')
    setValidMoves([])
    setValidTargets([])
  }, [])

  // Enemy AI
  const runEnemyTurn = useCallback(() => {
    setPhase('enemy')
    setValidMoves([])
    setValidTargets([])

    const enemies = unitsRef.current.filter(u => !u.isPlayer && u.hp > 0)

    enemies.forEach((enemy, i) => {
      setTimeout(() => {
        const en = unitsRef.current.find(u => u.id === enemy.id && u.hp > 0)
        const pl = unitsRef.current.find(u => u.isPlayer && u.hp > 0)
        if (!en || !pl) return

        const dirs: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
        let bestPos = en.pos
        let bestD   = cheby(en.pos, pl.pos)
        for (const [dx, dy] of dirs) {
          const np = { x: en.pos.x + dx, y: en.pos.y + dy }
          if (!inBounds(np) || blocked(unitsRef.current, obstaclesRef.current, np, en.id)) continue
          const d = cheby(np, pl.pos)
          if (d < bestD) { bestD = d; bestPos = np }
        }

        const didMove = bestPos.x !== en.pos.x || bestPos.y !== en.pos.y
        if (didMove) onAction?.(`${en.name} moves closer.`)

        let state = unitsRef.current.map(u => u.id === en.id ? { ...u, pos: bestPos } : u)
        const moved = state.find(u => u.id === en.id)!

        if (cheby(moved.pos, pl.pos) <= moved.atkRange) {
          // Cover reduces enemy hit chance
          const playerInCover = hasCover(pl.pos, obstaclesRef.current)
          const coverBonus = playerInCover ? HALF_COVER_BONUS : 0
          const hitDc = BASE_HIT_DC + coverBonus

          let atk: DiceRoll
          if (playerDodgingRef.current) {
            const r1 = fireRoll('Enemy attack (disadv.)', 20, 1, hitDc)
            const r2 = fireRoll('Enemy attack (disadv.)', 20, 1, hitDc)
            atk = r1.total <= r2.total ? r1 : r2
            const label = playerInCover ? '(disadvantage + cover!)' : '(disadvantage)'
            onAction?.(`${en.name} attacks ${label} — ${atk.isHit ? 'Hit!' : 'Dodged!'}`)
          } else {
            const label = playerInCover ? ' (vs. cover)' : ''
            atk = fireRoll(`Enemy attack${label}`, 20, 1, hitDc)
            onAction?.(`${en.name} attacks — ${atk.isHit ? 'Hit!' : 'Miss'}`)
          }

          if (atk.isHit) {
            const dmg = fireRoll('Enemy damage', 6)
            state = state.map(u => u.isPlayer ? { ...u, hp: Math.max(0, u.hp - dmg.total) } : u)
            onAction?.(`${en.name} deals ${dmg.total} damage!`)
          }
        } else {
          onAction?.(`${en.name} is out of range.`)
        }
        setUnits(state)

        if (i === enemies.length - 1) {
          setTimeout(() => {
            const pl2 = unitsRef.current.find(u => u.isPlayer && u.hp > 0)
            const en2 = unitsRef.current.filter(u => !u.isPlayer && u.hp > 0)
            if (!pl2) { setPhase('done'); onCombatEnd(false, unitsRef.current) }
            else if (en2.length === 0) { setPhase('done'); onCombatEnd(true, unitsRef.current) }
            else {
              setPlayerMoved(false)
              setPlayerAttacked(false)
              setPlayerDodging(false)
              setPhase('player')
              refreshHighlights(unitsRef.current, false, false)
            }
          }, 500)
        }
      }, 400 + i * 900)
    })

    if (enemies.length === 0) {
      setTimeout(() => { setPhase('done'); onCombatEnd(true, unitsRef.current) }, 300)
    }
  }, [fireRoll, setUnits, onCombatEnd, refreshHighlights])

  const handleCellClick = useCallback((pos: GridPos) => {
    if (phase !== 'player' || playerMoved) return
    if (!validMoves.some(m => m.x === pos.x && m.y === pos.y)) return
    const next = unitsRef.current.map(u => u.isPlayer ? { ...u, pos } : u)
    setUnits(next)
    setPlayerMoved(true)
    refreshHighlights(next, true, playerAttacked)
  }, [phase, playerMoved, playerAttacked, validMoves, setUnits, refreshHighlights])

  const handleEnemyClick = useCallback((targetId: string) => {
    if (phase !== 'player' || playerAttacked) return
    if (!validTargets.includes(targetId)) return

    const target = unitsRef.current.find(u => u.id === targetId)
    const targetName = target?.name ?? 'enemy'
    const atk = fireRoll('Attack roll', 20)

    if (atk.isHit) {
      const dmg = fireRoll('Damage', 6)
      onAction?.(`You hit ${targetName} for ${dmg.total} damage!`)
      const next = unitsRef.current.map(u => u.id === targetId ? { ...u, hp: Math.max(0, u.hp - dmg.total) } : u)
      setUnits(next)
      onAttackDone?.(targetName, true, dmg.total, unitsRef.current)
      const stillAlive = next.filter(u => !u.isPlayer && u.hp > 0)
      if (stillAlive.length === 0) {
        setPlayerAttacked(true)
        setValidMoves([])
        setValidTargets([])
        setTimeout(() => { setPhase('done'); onCombatEnd(true, unitsRef.current) }, 800)
        return
      }
    } else {
      onAction?.(`You swing at ${targetName} — Miss!`)
      onAttackDone?.(targetName, false, 0, unitsRef.current)
    }

    setPlayerAttacked(true)
    setValidMoves([])
    setValidTargets([])
    setTimeout(() => runEnemyTurn(), 600)
  }, [phase, playerAttacked, validTargets, fireRoll, setUnits, onCombatEnd, runEnemyTurn, onAttackDone])

  const handleDodge = useCallback(() => {
    if (phase !== 'player' || playerAttacked) return
    setPlayerDodging(true)
    setPlayerAttacked(true)
    setValidTargets([])
    fireRoll('Dodge — enemies roll with disadvantage', 20)
    setTimeout(() => runEnemyTurn(), 600)
  }, [phase, playerAttacked, fireRoll, runEnemyTurn])

  const endPlayerTurn = useCallback(() => {
    if (phase !== 'player') return
    runEnemyTurn()
  }, [phase, runEnemyTurn])

  return {
    units, obstacles, phase, playerMoved, playerAttacked, playerDodging,
    validMoves, validTargets,
    initGrid, forfeit, handleCellClick, handleEnemyClick, handleDodge, endPlayerTurn,
  }
}
