import { useState, useCallback } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useSettingsStore } from '../store/settingsStore'
import { useGameStore } from '../store/gameStore'
import type { CampaignRow, GameState } from '../types/index'

export function useSupabase() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { getSupabaseUrl, getSupabaseAnonKey, getUserId } = useSettingsStore()

  function getClient() {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    if (!url || !key) return null
    return getSupabaseClient(url, key)
  }

  const isConfigured = () => {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    return Boolean(url && key)
  }

  // Save or update the current campaign
  const saveCurrentCampaign = useCallback(async () => {
    const client = getClient()
    if (!client) return

    const userId = getUserId()
    if (!userId) return

    const state = useGameStore.getState()
    if (!state.campaignId || !state.theme) return

    const playerName = state.players[0]?.name ?? 'Unknown'
    const themeLabel = state.theme.replace('_', ' ')
    const displayName = `${themeLabel} · ${playerName}`

    setIsSaving(true)
    setError(null)

    try {
      const { error: upsertError } = await client
        .from('campaigns')
        .upsert(
          {
            campaign_id: state.campaignId,
            user_id: userId,
            display_name: displayName,
            theme: state.theme,
            kids_mode: state.kidsMode,
            state: state as unknown as Record<string, unknown>,
            message_count: state.messages.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id' }
        )

      if (upsertError) throw upsertError
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save campaign'
      setError(msg)
      console.error('[useSupabase] save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [])

  // List saved campaigns for this user only
  const listCampaigns = useCallback(async (): Promise<CampaignRow[]> => {
    const client = getClient()
    if (!client) return []

    const userId = getUserId()
    if (!userId) return []

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await client
        .from('campaigns')
        .select('id, campaign_id, display_name, theme, kids_mode, message_count, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (fetchError) throw fetchError
      return (data ?? []) as CampaignRow[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load campaigns'
      setError(msg)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load a specific campaign — must belong to this user
  const loadCampaign = useCallback(async (campaignId: string): Promise<boolean> => {
    const client = getClient()
    if (!client) return false

    const userId = getUserId()
    if (!userId) return false

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await client
        .from('campaigns')
        .select('state')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError
      if (!data?.state) throw new Error('Campaign data is empty')

      const savedState = data.state as GameState

      // Restore state into the store (skip session-only stats)
      const store = useGameStore.getState()
      store.startCampaign(savedState.theme!, savedState.players, savedState.kidsMode)

      // Re-hydrate remaining state fields not covered by startCampaign
      useGameStore.setState({
        campaignId: savedState.campaignId,
        currentLocation: savedState.currentLocation,
        quests: savedState.quests,
        npcs: savedState.npcs,
        sessionEvents: savedState.sessionEvents,
        messages: savedState.messages,
        combatState: savedState.combatState,
        map: savedState.map,
        createdAt: savedState.createdAt,
        updatedAt: savedState.updatedAt,
      })

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load campaign'
      setError(msg)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete a campaign — must belong to this user
  const deleteCampaign = useCallback(async (campaignId: string): Promise<boolean> => {
    const client = getClient()
    if (!client) return false

    const userId = getUserId()
    if (!userId) return false

    try {
      const { error: deleteError } = await client
        .from('campaigns')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete campaign'
      setError(msg)
      return false
    }
  }, [])

  return {
    isConfigured,
    isSaving,
    isLoading,
    error,
    saveCurrentCampaign,
    listCampaigns,
    loadCampaign,
    deleteCampaign,
  }
}
