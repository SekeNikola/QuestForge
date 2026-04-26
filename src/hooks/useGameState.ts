import { useGameStore } from '../store/gameStore'
import type { Character } from '../types/index'

export function useGameState() {
  const store = useGameStore()

  const activePlayer: Character | null = store.players[0] ?? null
  const isInCombat: boolean = store.combatState?.active ?? false

  return {
    state: store as ReturnType<typeof useGameStore.getState>,
    activePlayer,
    isInCombat,
    startCampaign: store.startCampaign,
    appendMessage: store.appendMessage,
    updatePlayerHP: store.updatePlayerHP,
    addSessionEvent: store.addSessionEvent,
    updateMemory: store.updateMemory,
    startCombat: store.startCombat,
    resolveCombatTurn: store.resolveCombatTurn,
    endCombat: store.endCombat,
    resetSession: store.resetSession,
  }
}
