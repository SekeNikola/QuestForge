import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ResponseLength } from '../types/index'
import { sessionStorageGet, sessionStorageSet, sessionStorageRemove } from '../utils/storage'

interface SettingsStore {
  model: 'claude-sonnet-4-5'
  responseLength: ResponseLength
  maxTokensMap: { compact: number; normal: number; verbose: number }
  kidsMode: boolean
  supabaseUrl: string
  supabaseAnonKey: string

  setResponseLength: (length: ResponseLength) => void
  setKidsMode: (enabled: boolean) => void
  setSupabaseUrl: (url: string) => void
  setSupabaseAnonKey: (key: string) => void

  // Claude API key — sessionStorage only (cleared on tab close)
  setApiKey: (key: string) => void
  getApiKey: () => string
  clearApiKey: () => void
  getSupabaseUrl: () => string
  getSupabaseAnonKey: () => string
  getUserId: () => string
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      model: 'claude-sonnet-4-5',
      responseLength: 'normal',
      maxTokensMap: { compact: 400, normal: 900, verbose: 1600 },
      kidsMode: false,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',

      setResponseLength: (length) => set({ responseLength: length }),
      setKidsMode: (enabled) => set({ kidsMode: enabled }),
      setSupabaseUrl: (url) => set({ supabaseUrl: url }),
      setSupabaseAnonKey: (key) => set({ supabaseAnonKey: key }),

      setApiKey: (key) => sessionStorageSet('qf:api_key', key),
      getApiKey: () => sessionStorageGet<string>('qf:api_key') ?? '',
      clearApiKey: () => sessionStorageRemove('qf:api_key'),
      getSupabaseUrl: () => get().supabaseUrl,
      getSupabaseAnonKey: () => get().supabaseAnonKey,
      getUserId: () => {
        const key = sessionStorageGet<string>('qf:api_key') ?? ''
        if (!key) return ''
        let h = 0x811c9dc5
        for (let i = 0; i < key.length; i++) {
          h ^= key.charCodeAt(i)
          h = Math.imul(h, 0x01000193) >>> 0
        }
        return h.toString(16).padStart(8, '0')
      },
    }),
    {
      name: 'qf:settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        model: state.model,
        responseLength: state.responseLength,
        maxTokensMap: state.maxTokensMap,
        kidsMode: state.kidsMode,
        supabaseUrl: state.supabaseUrl,
        supabaseAnonKey: state.supabaseAnonKey,
      }),
    }
  )
)
