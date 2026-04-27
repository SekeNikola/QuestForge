import { useState } from 'react'
import { Eye, EyeOff, X, Trash2, LogOut, Cloud, Save } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { sanitiseApiKey } from '../utils/storage'
import { useTokenTracker } from '../hooks/useTokenTracker'
import { useGameStore } from '../store/gameStore'
import { useSupabase } from '../hooks/useSupabase'
import { Button } from '../components/ui/Button'
import { KidsModeToggle } from '../components/setup/KidsModeToggle'
import type { ResponseLength } from '../types/index'

interface SettingsScreenProps {
  onClose: () => void
  onEndCampaign: () => void
}

function formatCostStr(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(3)}¢`
  return `$${usd.toFixed(4)}`
}

export function SettingsScreen({ onClose, onEndCampaign }: SettingsScreenProps) {
  const settings = useSettingsStore()
  const { sessionInputTokens, sessionOutputTokens, sessionTotalTokens, sessionCostUsd, allTimeInputTokens, allTimeOutputTokens, allTimeCostUsd } = useTokenTracker()
  const resetSession = useGameStore((s) => s.resetSession)
  const { isConfigured, isSaving, saveCurrentCampaign } = useSupabase()

  const [apiKeyInput, setApiKeyInput] = useState(settings.getApiKey())
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl)
  const [supabaseKey, setSupabaseKey] = useState(settings.supabaseAnonKey)
  const [supaSaved, setSupaSaved] = useState(false)

  const handleSaveKey = () => {
    settings.setApiKey(sanitiseApiKey(apiKeyInput))
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const handleSaveSupabase = () => {
    settings.setSupabaseUrl(supabaseUrl.trim())
    settings.setSupabaseAnonKey(supabaseKey.trim())
    setSupaSaved(true)
    setTimeout(() => setSupaSaved(false), 2000)
  }

  const responseLengths: { value: ResponseLength; label: string; desc: string }[] = [
    { value: 'compact', label: 'Compact', desc: '~300 tokens · fastest, cheapest' },
    { value: 'normal', label: 'Normal', desc: '~600 tokens · balanced' },
    { value: 'verbose', label: 'Verbose', desc: '~1200 tokens · richest detail' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-end">
      <div className="w-full max-w-sm h-full bg-[#0f0f1a] border-l border-[#2d2d4e] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d2d4e] sticky top-0 bg-[#0f0f1a]">
          <h2 className="text-white font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-8">
          {/* API Key */}
          <section>
            <h3 className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-3">Anthropic API Key</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                    placeholder="sk-ant-…"
                    className="w-full bg-[#1a1a2e] border border-[#2d2d4e] focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none pr-10 font-mono"
                    aria-label="API key input"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button
                  variant={keySaved ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleSaveKey}
                  disabled={!apiKeyInput.trim()}
                >
                  {keySaved ? '✓ Saved' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Key stored in session memory only — cleared on tab close. Never sent anywhere except Anthropic.
              </p>
            </div>
          </section>

          {/* Response Length */}
          <section>
            <h3 className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-3">Response Length</h3>
            <div className="space-y-2">
              {responseLengths.map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={[
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    settings.responseLength === value
                      ? 'bg-violet-600/10 border-violet-500/40 text-white'
                      : 'bg-[#1a1a2e] border-[#2d2d4e] text-gray-300 hover:border-[#4d4d7e]',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="responseLength"
                    value={value}
                    checked={settings.responseLength === value}
                    onChange={() => settings.setResponseLength(value)}
                    className="sr-only"
                  />
                  <div className={[
                    'w-3.5 h-3.5 rounded-full border-2 shrink-0',
                    settings.responseLength === value
                      ? 'bg-violet-500 border-violet-400'
                      : 'border-[#4d4d7e]',
                  ].join(' ')} />
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Kids Mode */}
          <section>
            <h3 className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-3">Content</h3>
            <KidsModeToggle isInSession />
          </section>

          {/* Token Stats */}
          <section>
            <h3 className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-3">Token Usage</h3>
            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2d2d4e]">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">This Session</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Input</div>
                    <div className="text-white font-mono">{sessionInputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Output</div>
                    <div className="text-white font-mono">{sessionOutputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Total</div>
                    <div className="text-white font-mono">{sessionTotalTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Est. Cost</div>
                    <div className="text-amber-300 font-mono">{formatCostStr(sessionCostUsd)}</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">All Time</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Input</div>
                    <div className="text-gray-300 font-mono">{allTimeInputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Output</div>
                    <div className="text-gray-300 font-mono">{allTimeOutputTokens.toLocaleString()}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 text-xs">Est. Total Cost</div>
                    <div className="text-amber-300 font-mono">{formatCostStr(allTimeCostUsd)}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Supabase sync */}
          <section>
            <h3 className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-1">Cloud Save (Supabase)</h3>
            <p className="text-xs text-gray-600 mb-3">
              Connect your Supabase project to save campaigns and resume from any device.{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">Create a free project →</a>
            </p>
            <div className="space-y-2">
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none font-mono"
              />
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="Anon / public key"
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none font-mono"
              />
              <div className="flex gap-2">
                <Button
                  variant={supaSaved ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleSaveSupabase}
                  disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
                  className="flex-1"
                >
                  <Cloud size={13} />
                  {supaSaved ? '✓ Saved' : 'Save Supabase Config'}
                </Button>
                {isConfigured() && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isSaving}
                    onClick={() => saveCurrentCampaign()}
                  >
                    <Save size={13} />
                    Save Now
                  </Button>
                )}
              </div>
              {isConfigured() && (
                <p className="text-xs text-green-500">✓ Connected — campaign auto-saves after each turn</p>
              )}
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h3 className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-3">Campaign</h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => { resetSession(); onClose() }}
              >
                <Trash2 size={14} />
                Clear Session Data
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="w-full justify-start"
                onClick={onEndCampaign}
              >
                <LogOut size={14} />
                End Campaign & Return to Setup
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
