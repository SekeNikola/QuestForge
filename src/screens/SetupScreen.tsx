import { useState, useEffect, useRef } from 'react'
import type { Theme, Character, CampaignRow } from '../types/index'
import { ThemePicker } from '../components/setup/ThemePicker'
import { KidsModeToggle } from '../components/setup/KidsModeToggle'
import { CharacterForm, buildCharacterFromDraft } from '../components/setup/CharacterForm'
import { Button } from '../components/ui/Button'
import { useGameStore } from '../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import { useSettingsStore } from '../store/settingsStore'
import { useTokenTracker } from '../hooks/useTokenTracker'
import { useSupabase } from '../hooks/useSupabase'
import { ChevronRight, ChevronLeft, Swords, Cloud, Trash2, Eye, EyeOff, Key, X } from 'lucide-react'
import { sanitiseApiKey } from '../utils/storage'

type Step = 'theme' | 'character' | 'review'

interface SetupScreenProps {
  onStart: () => void
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'theme', label: 'World' },
  { id: 'character', label: 'Character' },
  { id: 'review', label: 'Begin' },
]

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [step, setStep] = useState<Step>('theme')
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [characterDraft, setCharacterDraft] = useState<Partial<Character>>({})
  const [isStarting, setIsStarting] = useState(false)
  const [savedCampaigns, setSavedCampaigns] = useState<CampaignRow[]>([])
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null)

  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const keyPanelRef = useRef<HTMLDivElement>(null)

  const startCampaign = useGameStore((s) => s.startCampaign)
  const resetSession  = useGameStore((s) => s.resetSession)
  const localCampaign = useGameStore(useShallow((s) =>
    s.campaignId && s.theme && s.players.length > 0 && s.messages.length > 0
      ? { campaignId: s.campaignId, theme: s.theme, playerName: s.players[0]?.name ?? '?', messageCount: s.messages.length, kidsMode: s.kidsMode, updatedAt: s.updatedAt }
      : null
  ))
  const { kidsMode, getApiKey, setApiKey } = useSettingsStore()
  const { allTimeInputTokens, allTimeOutputTokens, allTimeCostUsd } = useTokenTracker()
  const { isConfigured, isLoading, listCampaigns, loadCampaign, deleteCampaign } = useSupabase()

  useEffect(() => { setApiKeyInput(getApiKey()) }, [])
  useEffect(() => {
    if (isConfigured()) listCampaigns().then(setSavedCampaigns)
  }, [])

  // Close key panel on outside click
  useEffect(() => {
    if (!showKeyPanel) return
    const handler = (e: MouseEvent) => {
      if (keyPanelRef.current && !keyPanelRef.current.contains(e.target as Node)) {
        setShowKeyPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showKeyPanel])

  const handleSaveKey = () => {
    setApiKey(sanitiseApiKey(apiKeyInput))
    setKeySaved(true)
    setTimeout(() => { setKeySaved(false); setShowKeyPanel(false) }, 1200)
  }

  const handleResume = async (row: CampaignRow) => {
    if (!getApiKey()) { setShowKeyPanel(true); return }
    setLoadingCampaignId(row.campaign_id)
    const ok = await loadCampaign(row.campaign_id)
    if (ok) onStart()
    else setLoadingCampaignId(null)
  }

  const handleDelete = async (row: CampaignRow, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteCampaign(row.campaign_id)
    setSavedCampaigns((prev) => prev.filter((c) => c.campaign_id !== row.campaign_id))
  }

  const handleDeleteLocal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (localCampaign && isConfigured()) {
      await deleteCampaign(localCampaign.campaignId)
      setSavedCampaigns((prev) => prev.filter((c) => c.campaign_id !== localCampaign.campaignId))
    }
    resetSession()
  }

  const canProceedFromTheme = selectedTheme !== null
  const canProceedFromCharacter = !!(characterDraft.name?.trim() && characterDraft.class)

  const handleBegin = async () => {
    if (!selectedTheme || !canProceedFromCharacter) return
    setIsStarting(true)
    const character = buildCharacterFromDraft(characterDraft)
    startCampaign(selectedTheme, [character], kidsMode)
    onStart()
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const hasApiKey = !!getApiKey()

  return (
    <div className="min-h-dvh bg-[#0b0b1a] flex flex-col items-center px-4 sm:px-6 py-8 sm:py-10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-violet-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top-right: token usage + API key */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2" ref={keyPanelRef}>
        {/* All-time token badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#12122a] border border-[#252545] text-xs font-mono text-gray-400">
          <span className="text-gray-500">all-time</span>
          <span className="text-gray-300">{(allTimeInputTokens + allTimeOutputTokens).toLocaleString()} tok</span>
          <span className="text-[#252545]">·</span>
          <span className="text-amber-400">${allTimeCostUsd.toFixed(3)}</span>
        </div>

        {/* API key button */}
        <button
          onClick={() => setShowKeyPanel((v) => !v)}
          aria-label="Set API key"
          className={[
            'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
            hasApiKey
              ? 'bg-violet-600/20 border-violet-500/50 text-violet-400'
              : 'bg-[#12122a] border-[#252545] text-gray-500 hover:border-violet-500/50 hover:text-violet-400',
          ].join(' ')}
        >
          <Key size={14} />
        </button>

        {/* API key panel */}
        {showKeyPanel && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-[#12122a] border border-[#252545] rounded-2xl p-4 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Anthropic API Key</span>
              <button onClick={() => setShowKeyPanel(false)} className="text-gray-600 hover:text-gray-400">
                <X size={14} />
              </button>
            </div>
            <div className="relative mb-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                placeholder="sk-ant-…"
                autoFocus
                className="w-full bg-[#0b0b1a] border border-[#252545] focus:border-violet-500 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button
              onClick={handleSaveKey}
              disabled={!apiKeyInput.trim()}
              className={[
                'w-full py-2 rounded-xl text-sm font-bold transition-colors',
                keySaved
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                  : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40',
              ].join(' ')}
            >
              {keySaved ? '✓ Saved' : 'Save Key'}
            </button>
            <p className="text-xs text-gray-600 mt-2">Session only — cleared on tab close.</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-[60rem] relative z-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">QuestForge</h1>
          <p className="text-gray-400 text-sm mt-2">AI-powered solo &amp; family RPG adventures</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const isActive = i === stepIndex
            const isDone = i < stepIndex
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                    isActive ? 'bg-violet-600 text-white' :
                    isDone   ? 'bg-violet-700 text-white' :
                               'bg-[#1e1e38] text-gray-500 border border-[#2d2d4e]',
                  ].join(' ')}>
                    {i + 1}
                  </div>
                  <span className={[
                    'text-sm font-medium',
                    isActive ? 'text-white' : 'text-gray-500',
                  ].join(' ')}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={[
                    'w-12 h-px mx-3',
                    i < stepIndex ? 'bg-violet-600' : 'bg-[#2d2d4e]',
                  ].join(' ')} />
                )}
              </div>
            )
          })}
        </div>

        {/* Local resume card — hide if Supabase already lists this campaign */}
        {localCampaign && step === 'theme' && !savedCampaigns.some(r => r.campaign_id === localCampaign.campaignId) && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 uppercase tracking-wider font-bold">
              <span>↩</span>
              <span>Continue Your Adventure</span>
            </div>
            <div
              className="flex items-center gap-3 px-4 py-3 bg-[#12122a] border border-violet-500/40 hover:border-violet-400/70 rounded-2xl cursor-pointer transition-colors group"
              onClick={() => { if (!getApiKey()) { setShowKeyPanel(true); return }; onStart() }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') { if (!getApiKey()) { setShowKeyPanel(true); return }; onStart() } }}
            >
              <div className="text-2xl">
                {localCampaign.theme === 'dark_fantasy' ? '⚔️' : localCampaign.theme === 'space_odyssey' ? '🚀' : localCampaign.theme === 'pirate_seas' ? '🏴‍☠️' : localCampaign.theme === 'horror_manor' ? '🕯️' : '🧱'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {localCampaign.theme.replace(/_/g, ' ')} · {localCampaign.playerName}
                </div>
                <div className="text-gray-500 text-xs">
                  {localCampaign.messageCount} messages · {new Date(localCampaign.updatedAt).toLocaleDateString()}
                </div>
              </div>
              {localCampaign.kidsMode && (
                <span className="text-xs text-yellow-400 border border-yellow-700/40 rounded-full px-2 py-0.5">Kids</span>
              )}
              <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); if (!getApiKey()) { setShowKeyPanel(true); return }; onStart() }}>Resume</Button>
              <button
                onClick={handleDeleteLocal}
                className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                aria-label="Delete campaign"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="border-t border-[#2d2d4e] my-5" />
          </div>
        )}

        {/* Saved campaigns */}
        {isConfigured() && savedCampaigns.length > 0 && step === 'theme' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 uppercase tracking-wider font-bold">
              <Cloud size={12} />
              <span>Resume a Campaign</span>
            </div>
            <div className="space-y-2">
              {savedCampaigns.map((row) => (
                <div
                  key={row.campaign_id}
                  className="flex items-center gap-3 px-4 py-3 bg-[#12122a] border border-[#252545] hover:border-violet-500/50 rounded-2xl cursor-pointer transition-colors group"
                  onClick={() => handleResume(row)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleResume(row)}
                >
                  <div className="text-2xl">
                    {row.theme === 'dark_fantasy' ? '⚔️' : row.theme === 'space_odyssey' ? '🚀' : row.theme === 'pirate_seas' ? '🏴‍☠️' : row.theme === 'horror_manor' ? '🕯️' : '🧱'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{row.display_name}</div>
                    <div className="text-gray-500 text-xs">{row.message_count} messages · {new Date(row.updated_at).toLocaleDateString()}</div>
                  </div>
                  {row.kids_mode && (
                    <span className="text-xs text-yellow-400 border border-yellow-700/40 rounded-full px-2 py-0.5">Kids</span>
                  )}
                  <Button variant="primary" size="sm" loading={loadingCampaignId === row.campaign_id} onClick={(e) => { e.stopPropagation(); handleResume(row) }}>
                    Resume
                  </Button>
                  <button onClick={(e) => handleDelete(row, e)} className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:outline-none" aria-label="Delete campaign">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            {isLoading && <div className="text-center text-xs text-gray-600 mt-2">Loading campaigns…</div>}
            <div className="border-t border-[#2d2d4e] my-5" />
          </div>
        )}

        {/* Step: World */}
        {step === 'theme' && (
          <div className="space-y-4">
            <ThemePicker selected={selectedTheme} onSelect={setSelectedTheme} />
            <KidsModeToggle />
            <button
              disabled={!canProceedFromTheme}
              onClick={() => setStep('character')}
              className={[
                'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all',
                canProceedFromTheme
                  ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer'
                  : 'bg-[#1e1e38] text-gray-600 cursor-not-allowed',
              ].join(' ')}
            >
              Next: Create Character
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step: Character */}
        {step === 'character' && (
          <div className="space-y-4">
            <div className="bg-[#12122a] border border-[#252545] rounded-2xl p-1">
              {selectedTheme && (
                <CharacterForm
                  index={0}
                  theme={selectedTheme}
                  onChange={(draft) => setCharacterDraft(draft)}
                  initialValue={characterDraft}
                />
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('theme')}
                className="flex items-center gap-1.5 px-5 py-4 rounded-2xl font-bold text-base text-gray-400 bg-[#12122a] border border-[#252545] hover:border-[#3d3d6e] transition-colors"
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <button
                disabled={!canProceedFromCharacter}
                onClick={() => setStep('review')}
                className={[
                  'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all',
                  canProceedFromCharacter
                    ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer'
                    : 'bg-[#1e1e38] text-gray-600 cursor-not-allowed',
                ].join(' ')}
              >
                Review &amp; Begin
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && selectedTheme && (
          <div className="space-y-4">
            <div className="bg-[#12122a] border border-[#252545] rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-bold text-lg">Your Adventure</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">World</span>
                  <div className="text-white mt-1 capitalize">{selectedTheme.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Character</span>
                  <div className="text-white mt-1">{characterDraft.name} · {characterDraft.class}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Kids Mode</span>
                  <div className={`mt-1 ${kidsMode ? 'text-yellow-300' : 'text-gray-400'}`}>
                    {kidsMode ? '✓ Enabled' : 'Off'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">AI Model</span>
                  <div className="text-gray-300 mt-1 text-xs font-mono">claude-sonnet-4-6</div>
                </div>
              </div>

              {!hasApiKey && (
                <div className="border-t border-[#252545] pt-4">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <Key size={14} />
                    <span>No API key set — click the key icon in the top right to add one.</span>
                  </div>
                </div>
              )}
              {hasApiKey && (
                <div className="border-t border-[#252545] pt-4">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Key size={14} />
                    <span>API key configured ✓</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('character')}
                className="flex items-center gap-1.5 px-5 py-4 rounded-2xl font-bold text-base text-gray-400 bg-[#12122a] border border-[#252545] hover:border-[#3d3d6e] transition-colors"
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <button
                onClick={handleBegin}
                disabled={isStarting}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-60"
              >
                <Swords size={18} />
                Begin Adventure
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
