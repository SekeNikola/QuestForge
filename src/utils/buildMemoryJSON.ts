import type { GameState, MemoryJSON } from '../types/index.ts'
import { estimateTokens } from './tokenEstimate.ts'

/**
 * Serialises the relevant parts of GameState into a compact JSON string
 * for injection into every Claude request.
 *
 * Rules:
 * - Empty arrays are omitted entirely to save tokens
 * - recentEvents capped at last 10
 * - Inventory is aggregated from all players (first player for solo)
 * - Target: < 250 tokens (verified by estimateTokens)
 */
export function buildMemoryJSON(state: GameState): string {
  if (!state.theme) {
    return JSON.stringify({ world: 'dark_fantasy', location: '', round: 0, players: [], kidsMode: false, combatActive: false })
  }

  const memory: MemoryJSON = {
    world: state.theme,
    location: state.currentLocation,
    round: state.sessionStats.turnCount,
    players: state.players.map(p => ({
      name: p.name,
      hp: p.hp,
      maxHp: p.maxHp,
      level: p.level,
      class: p.class,
    })),
    kidsMode: state.kidsMode,
    combatActive: state.combatState?.active ?? false,
  }

  // Only include non-empty optional fields
  if (state.quests.length > 0) {
    memory.quests = state.quests.map(q => ({ name: q.name, status: q.status }))
  }

  if (state.npcs.length > 0) {
    memory.npcs = state.npcs.map(n => ({ name: n.name, relation: n.relation, lastSeen: n.lastSeen }))
  }

  // Aggregate inventory across all players
  const allInventory = state.players.flatMap(p => p.inventory)
  if (allInventory.length > 0) {
    memory.inventory = allInventory
  }

  const recentEvents = state.sessionEvents.slice(-10)
  if (recentEvents.length > 0) {
    memory.recentEvents = recentEvents
  }

  const json = JSON.stringify(memory)

  // Dev-mode token budget warning
  if (import.meta.env.DEV) {
    const tokens = estimateTokens(json)
    if (tokens > 250) {
      console.warn(`[buildMemoryJSON] Memory JSON estimated at ${tokens} tokens (target ≤ 250)`)
    }
  }

  return json
}

/**
 * Wraps memory JSON in the <memory> XML block injected at the top of each user message.
 */
export function buildUserMessage(userInput: string, state: GameState): string {
  const memoryJson = buildMemoryJSON(state)
  return `<memory>\n${memoryJson}\n</memory>\n\n${userInput}`
}
