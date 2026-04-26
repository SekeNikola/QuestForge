import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import type { Combatant, CombatEntry, CombatResult } from '../types/index'

function randomInt(max: number): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return (arr[0]! % max) + 1
}

export function useCombat() {
  const gameStore = useGameStore()
  const settings = useSettingsStore()

  const currentCombatant: Combatant | null = (() => {
    const cs = gameStore.combatState
    if (!cs || !cs.active) return null
    const ref = cs.turnOrder[cs.currentTurnIndex]
    if (!ref) return null
    return cs.combatants.find((c) => c.id === ref.id) ?? null
  })()

  const isPlayerTurn = currentCombatant?.isPlayer ?? false

  const initiateCombat = (enemies: Omit<Combatant, 'initiative' | 'isDefeated'>[]) => {
    const enemiesWithInitiative: Combatant[] = enemies.map((e) => ({
      ...e,
      initiative: randomInt(20),
      isDefeated: false,
    }))
    gameStore.startCombat(enemiesWithInitiative)
  }

  const executeTurn = (actorId: string, action: string, targetId: string): CombatEntry => {
    const cs = gameStore.combatState
    if (!cs) throw new Error('No active combat')

    const actor = cs.combatants.find((c) => c.id === actorId)
    const target = cs.combatants.find((c) => c.id === targetId)
    if (!actor || !target) throw new Error('Invalid actor or target')

    const roll = randomInt(20)
    const modifier = Math.floor((actor.hp / actor.maxHp) * 3) // simple modifier
    const total = roll + modifier

    let result: CombatEntry['result']
    let damage: number | undefined

    if (roll === 20) {
      result = 'crit'
      damage = randomInt(8) + randomInt(8)
    } else if (roll === 1) {
      result = 'miss'
    } else if (total >= target.ac) {
      result = 'hit'
      damage = randomInt(8)
    } else {
      result = 'miss'
    }

    const newHp = damage !== undefined ? Math.max(0, target.hp - damage) : target.hp
    let finalResult: CombatResult = result

    if (newHp === 0) {
      finalResult = settings.kidsMode ? 'defeated' : 'death'
    }

    const entry: CombatEntry = {
      id: crypto.randomUUID(),
      round: cs.round,
      actorId,
      actorName: actor.name,
      targetId,
      targetName: target.name,
      action,
      roll,
      modifier,
      total,
      result: finalResult,
      damage,
      hpAfter: newHp,
      hpMax: target.maxHp,
      narrative: finalResult === 'crit'
        ? `${actor.name} lands a devastating critical hit on ${target.name}!`
        : finalResult === 'miss'
        ? `${actor.name}'s attack misses ${target.name}.`
        : finalResult === 'death'
        ? `${target.name} falls, defeated.`
        : finalResult === 'defeated'
        ? `${target.name} is knocked out!`
        : `${actor.name} hits ${target.name} for ${damage} damage.`,
      timestamp: Date.now(),
    }

    gameStore.resolveCombatTurn(entry)
    return entry
  }

  const executeEnemyTurn = async (actorId: string): Promise<CombatEntry> => {
    // For MVP, resolve enemy turns locally with dice
    const cs = gameStore.combatState
    if (!cs) throw new Error('No active combat')

    const players = cs.combatants.filter((c) => c.isPlayer && !c.isDefeated)
    const target = players[Math.floor(Math.random() * players.length)]
    if (!target) throw new Error('No valid player targets')

    return executeTurn(actorId, 'attacks', target.id)
  }

  const endCombatIfOver = (): boolean => {
    const cs = gameStore.combatState
    if (!cs) return false

    const enemies = cs.combatants.filter((c) => !c.isPlayer)
    const allEnemiesDefeated = enemies.every((e) => e.isDefeated)

    if (allEnemiesDefeated) {
      gameStore.endCombat()
      return true
    }
    return false
  }

  return { initiateCombat, executeTurn, executeEnemyTurn, endCombatIfOver, currentCombatant, isPlayerTurn }
}
