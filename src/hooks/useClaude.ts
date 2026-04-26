import { useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTokenTracker } from './useTokenTracker'
import { buildSystemPrompt } from '../utils/buildSystemPrompt'
import { buildMemoryJSON } from '../utils/buildMemoryJSON'
import { parseAIResponse } from '../utils/parseAIResponse'
import type { SceneObject } from '../types/index'

function buildSceneXml(sceneObjects: SceneObject[], currentLocation: string): string {
  if (sceneObjects.length === 0) return ''
  const visible = sceneObjects.filter(o => o.proximity !== 'distant')
  const distant = sceneObjects.filter(o => o.proximity === 'distant')
  const lines: string[] = [`Location: ${currentLocation}`]
  if (visible.length > 0)
    lines.push(`Visible on map: ${visible.map(o => `${o.name} (${o.icon}, ${o.proximity}, ${o.direction})`).join('; ')}`)
  if (distant.length > 0)
    lines.push(`Outside player vision: ${distant.map(o => o.name).join(', ')}`)
  return `\n<scene>\n${lines.join('\n')}\n</scene>`
}

export function useClaude() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gameStore = useGameStore()
  const settings = useSettingsStore()
  const { addUsage } = useTokenTracker()

  const sendMessage = async (userInput: string): Promise<string> => {
    const apiKey = settings.getApiKey()
    if (!apiKey) {
      const msg = 'No API key set. Go to Settings and enter your Anthropic API key.'
      setError(msg)
      throw new Error(msg)
    }

    if (!gameStore.theme) {
      const msg = 'No active campaign. Start a campaign first.'
      setError(msg)
      throw new Error(msg)
    }

    setIsLoading(true)
    setError(null)

    // Strip internal tags before showing in chat
    const displayInput = userInput
      .replace(/^\[COMBAT ACTIVE\]\s*/, '')
      .replace(/^\[GRID STATE[^\]]*\]\s*/i, '')
      .trim()
    gameStore.appendMessage('user', displayInput)

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const memoryBlock = buildMemoryJSON(gameStore)
      const inCombat = gameStore.combatState?.active ?? false
      const combatCtx = inCombat
        ? `\n<combat_active>Player is in active combat. Check the [GRID STATE] in the message for positions and distances. Validate range before resolving. If the action involves a spell/ability: include [SKILL_CHECK] or [SAVING_THROW]. If it's out of range: say so in one sentence. For AOE spells: list ALL enemies hit.</combat_active>`
        : ''
      const sceneCtx = buildSceneXml(gameStore.sceneObjects ?? [], gameStore.currentLocation)
      const userMessage = `<memory>\n${memoryBlock}\n</memory>${combatCtx}${sceneCtx}\n\n${userInput}`

      const historyMessages = gameStore.messages.slice(-40).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await client.messages.create({
        model: settings.model,
        max_tokens: settings.maxTokensMap[settings.responseLength],
        system: buildSystemPrompt(gameStore.theme!, gameStore.kidsMode),
        messages: [
          ...historyMessages,
          { role: 'user', content: userMessage },
        ],
      })

      const rawText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')

      const parsed = parseAIResponse(rawText)

      if (parsed.memoryPatch) {
        gameStore.updateMemory(parsed.memoryPatch)
      }

      gameStore.appendMessage('assistant', parsed.narrative)

      if (response.usage) {
        addUsage(response.usage.input_tokens, response.usage.output_tokens)
      }

      return rawText
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error calling Claude API'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Non-blocking narration: fires API call without locking the UI or showing a user message.
  // Used for auto-narrating mechanical combat results (player attack, enemy kill, etc.)
  const sendNarration = async (context: string): Promise<void> => {
    const apiKey = settings.getApiKey()
    if (!apiKey || !gameStore.theme) return

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const historyMessages = gameStore.messages.slice(-14).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await client.messages.create({
        model: settings.model,
        max_tokens: 120,  // short combat narration only
        system: buildSystemPrompt(gameStore.theme!, gameStore.kidsMode),
        messages: [
          ...historyMessages,
          { role: 'user', content: context },
        ],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('').trim()

      if (text) {
        gameStore.appendMessage('assistant', text)
      }

      if (response.usage) {
        addUsage(response.usage.input_tokens, response.usage.output_tokens)
      }
    } catch {
      // silent — narration is optional flavor
    }
  }

  const clearError = () => setError(null)

  return { sendMessage, sendNarration, isLoading, error, clearError }
}
