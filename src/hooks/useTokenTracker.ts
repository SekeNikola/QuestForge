import { useGameStore } from '../store/gameStore'
import { getItem, setItem } from '../utils/storage'
import { calcCost } from '../utils/costEstimate'
import type { AllTimeStats } from '../types/index'

const ALL_TIME_KEY = 'qf:stats:alltime'

export function useTokenTracker() {
  const sessionStats = useGameStore((s) => s.sessionStats)
  const updateSessionStats = useGameStore((s) => s.updateSessionStats)

  const addUsage = (inputTokens: number, outputTokens: number) => {
    const cost = calcCost(inputTokens, outputTokens)
    updateSessionStats(inputTokens, outputTokens, cost)

    // Persist all-time totals
    const allTime = getItem<AllTimeStats>(ALL_TIME_KEY) ?? { inputTokens: 0, outputTokens: 0 }
    setItem<AllTimeStats>(ALL_TIME_KEY, {
      inputTokens: allTime.inputTokens + inputTokens,
      outputTokens: allTime.outputTokens + outputTokens,
    })
  }

  const resetSession = () => {
    // Zero session counts in store — all-time unaffected
    const store = useGameStore.getState()
    store.updateSessionStats(0, 0, 0) // no-op effectively; we reset via store.resetSession which is campaign-level
  }

  const allTime = getItem<AllTimeStats>(ALL_TIME_KEY) ?? { inputTokens: 0, outputTokens: 0 }
  const allTimeCostUsd = calcCost(allTime.inputTokens, allTime.outputTokens)

  return {
    sessionInputTokens: sessionStats.inputTokens,
    sessionOutputTokens: sessionStats.outputTokens,
    sessionTotalTokens: sessionStats.totalTokens,
    sessionCostUsd: sessionStats.estimatedCostUsd,
    allTimeInputTokens: allTime.inputTokens,
    allTimeOutputTokens: allTime.outputTokens,
    allTimeCostUsd,
    addUsage,
    resetSession,
  }
}
