import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  GameState,
  Theme,
  Character,
  MessageRole,
  Combatant,
  CombatEntry,
  CombatantRef,
  SceneObject,
} from '../types/index'

// ─── Default State ────────────────────────────────────────────────────────────

const defaultSessionStats = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  allTimeInputTokens: 0,
  allTimeOutputTokens: 0,
  turnCount: 0,
}

const defaultState: GameState = {
  campaignId: null,
  theme: null,
  kidsMode: false,
  players: [],
  currentLocation: '',
  quests: [],
  npcs: [],
  sceneObjects: [],
  sessionEvents: [],
  messages: [],
  combatState: null,
  map: [],
  sessionStats: defaultSessionStats,
  createdAt: 0,
  updatedAt: 0,
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  startCampaign: (theme: Theme, players: Character[], kidsMode: boolean) => void
  appendMessage: (role: MessageRole, content: string) => void
  updatePlayerHP: (playerId: string, delta: number) => void
  addSessionEvent: (event: string) => void
  updateMemory: (patch: Partial<Pick<GameState, 'currentLocation' | 'quests' | 'npcs' | 'sessionEvents' | 'sceneObjects'>>) => void
  setSceneObjects: (objects: SceneObject[]) => void
  grantXp: (amount: number) => boolean  // returns true if leveled up
  startCombat: (enemies: Combatant[]) => void
  resolveCombatTurn: (entry: CombatEntry) => void
  endCombat: () => void
  resetSession: () => void
  updateSessionStats: (input: number, output: number, cost: number) => void
  setAllTimeStats: (inputTokens: number, outputTokens: number) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      startCampaign: (theme, players, kidsMode) => {
        const campaignId = crypto.randomUUID()
        set({
          campaignId,
          theme,
          players,
          kidsMode,
          currentLocation: 'The Starting Point',
          quests: [],
          npcs: [],
          sceneObjects: [],
          sessionEvents: [],
          messages: [],
          combatState: null,
          map: [],
          sessionStats: defaultSessionStats,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      },

      appendMessage: (role, content) => {
        const id = crypto.randomUUID()
        const entry = { id, role, content, timestamp: Date.now() }
        set((state) => {
          const messages = [...state.messages, entry]
          const trimmed = messages.length > 100 ? messages.slice(messages.length - 100) : messages
          return { messages: trimmed, updatedAt: Date.now() }
        })
      },

      updatePlayerHP: (playerId, delta) => {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, hp: Math.max(0, Math.min(p.maxHp, p.hp + delta)) }
              : p
          ),
          updatedAt: Date.now(),
        }))
      },

      addSessionEvent: (event) => {
        set((state) => {
          const events = [...state.sessionEvents, event]
          return {
            sessionEvents: events.length > 10 ? events.slice(events.length - 10) : events,
            updatedAt: Date.now(),
          }
        })
      },

      updateMemory: (patch) => {
        set((state) => {
          const next = { ...state, ...patch, updatedAt: Date.now() }
          // Auto-clear scene objects when moving to a new location (unless AI sent fresh ones)
          if (patch.currentLocation && patch.currentLocation !== state.currentLocation && !patch.sceneObjects) {
            next.sceneObjects = []
          }
          return next
        })
      },

      setSceneObjects: (objects) => {
        set({ sceneObjects: objects, updatedAt: Date.now() })
      },

      grantXp: (amount) => {
        const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000]
        let leveledUp = false
        set((state) => {
          const players = state.players.map((p) => {
            const newXp = (p.xp ?? 0) + amount
            const oldLevel = p.level
            const newLevel = Math.min(10, XP_THRESHOLDS.filter(t => newXp >= t).length)
            if (newLevel > oldLevel) {
              leveledUp = true
              const conMod = Math.floor(((p.stats.con ?? 10) - 10) / 2)
              const hpGain = Math.max(1, conMod + 3)
              return { ...p, xp: newXp, level: newLevel, maxHp: p.maxHp + hpGain, hp: p.hp + hpGain }
            }
            return { ...p, xp: newXp }
          })
          return { players, updatedAt: Date.now() }
        })
        return leveledUp
      },

      startCombat: (enemies) => {
        const { players } = get()
        const combatants: Combatant[] = [
          ...players.map((p) => ({
            id: p.id,
            name: p.name,
            isPlayer: true,
            hp: p.hp,
            maxHp: p.maxHp,
            ac: p.ac,
            initiative: Math.floor(Math.random() * 20) + 1,
            isDefeated: false,
          })),
          ...enemies,
        ]
        const turnOrder: CombatantRef[] = combatants
          .map((c) => ({ id: c.id, initiative: c.initiative }))
          .sort((a, b) => b.initiative - a.initiative)

        set({
          combatState: {
            active: true,
            round: 1,
            turnOrder,
            currentTurnIndex: 0,
            combatants,
            log: [],
          },
          updatedAt: Date.now(),
        })
      },

      resolveCombatTurn: (entry) => {
        set((state) => {
          if (!state.combatState) return state
          const cs = state.combatState
          const updatedCombatants = cs.combatants.map((c) => {
            if (c.id === entry.targetId && entry.hpAfter !== undefined) {
              return { ...c, hp: entry.hpAfter, isDefeated: entry.hpAfter === 0 }
            }
            return c
          })
          const nextIndex = (cs.currentTurnIndex + 1) % cs.turnOrder.length
          const newRound = nextIndex === 0 ? cs.round + 1 : cs.round
          return {
            combatState: {
              ...cs,
              combatants: updatedCombatants,
              log: [...cs.log, entry],
              currentTurnIndex: nextIndex,
              round: newRound,
            },
            updatedAt: Date.now(),
          }
        })
      },

      endCombat: () => {
        set((state) => ({
          combatState: state.combatState
            ? { ...state.combatState, active: false }
            : null,
          updatedAt: Date.now(),
        }))
      },

      resetSession: () => {
        const { campaignId } = get()
        if (campaignId) {
          localStorage.removeItem(`qf:campaign:${campaignId}`)
        }
        set({ ...defaultState })
      },

      updateSessionStats: (input, output, cost) => {
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            inputTokens: state.sessionStats.inputTokens + input,
            outputTokens: state.sessionStats.outputTokens + output,
            totalTokens: state.sessionStats.totalTokens + input + output,
            estimatedCostUsd: state.sessionStats.estimatedCostUsd + cost,
            turnCount: state.sessionStats.turnCount + 1,
          },
        }))
      },

      setAllTimeStats: (inputTokens, outputTokens) => {
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            allTimeInputTokens: inputTokens,
            allTimeOutputTokens: outputTokens,
          },
        }))
      },
    }),
    {
      name: 'qf:campaign:default',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        sessionStats: {
          ...state.sessionStats,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          turnCount: 0,
        },
      }),
    }
  )
)
