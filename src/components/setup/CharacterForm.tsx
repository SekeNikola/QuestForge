import { useState, useEffect } from 'react'
import { Sword, Wand2, Eye, TreePine, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { Character, CharacterClass, CharacterStats, Theme } from '../../types/index'
import { Button } from '../ui/Button'
import { CharacterPortrait } from './CharacterPortrait'
import Anthropic from '@anthropic-ai/sdk'
import { useSettingsStore } from '../../store/settingsStore'
import React from 'react'

const CLASS_CONFIG: Record<CharacterClass, {
  icon: React.ReactNode; hp: number; description: string
  defaultStats: CharacterStats
}> = {
  Fighter: {
    icon: <Sword size={16} />, hp: 12,
    description: 'Armored warrior, frontline combatant',
    defaultStats: { str: 15, dex: 10, con: 14, int: 8, wis: 10, cha: 8 },
  },
  Mage: {
    icon: <Wand2 size={16} />, hp: 6,
    description: 'Arcane power, glass cannon',
    defaultStats: { str: 8, dex: 10, con: 10, int: 15, wis: 14, cha: 10 },
  },
  Rogue: {
    icon: <Eye size={16} />, hp: 8,
    description: 'Stealth and precision strikes',
    defaultStats: { str: 10, dex: 15, con: 10, int: 12, wis: 10, cha: 12 },
  },
  Ranger: {
    icon: <TreePine size={16} />, hp: 10,
    description: 'Ranged hunter, nature ally',
    defaultStats: { str: 12, dex: 14, con: 12, int: 10, wis: 13, cha: 8 },
  },
}

const CLASSES: CharacterClass[] = ['Fighter', 'Mage', 'Rogue', 'Ranger']

const STAT_LABELS: Array<{ key: keyof CharacterStats; label: string; abbr: string }> = [
  { key: 'str', label: 'Strength',     abbr: 'STR' },
  { key: 'dex', label: 'Dexterity',    abbr: 'DEX' },
  { key: 'con', label: 'Constitution', abbr: 'CON' },
  { key: 'int', label: 'Intelligence', abbr: 'INT' },
  { key: 'wis', label: 'Wisdom',       abbr: 'WIS' },
  { key: 'cha', label: 'Charisma',     abbr: 'CHA' },
]

function statMod(v: number) {
  const m = Math.floor((v - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

// D&D 5e point-buy costs (stat value → points spent above base of 8)
const POINT_COST: Record<number, number> = { 8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9 }
const POINT_BUDGET = 27
const BASE_STAT = 8

function statCost(v: number) { return POINT_COST[v] ?? 0 }
function totalSpent(s: CharacterStats) { return Object.values(s).reduce((sum, v) => sum + statCost(v), 0) }

const DEFAULT_STATS: CharacterStats = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }

export function buildCharacterFromDraft(draft: Partial<Character>): Character {
  const cls = draft.class ?? 'Fighter'
  const maxHp = CLASS_CONFIG[cls].hp + Math.floor(Math.random() * 4)
  return {
    id: crypto.randomUUID(),
    name: draft.name ?? '',
    class: cls,
    backstory: draft.backstory ?? '',
    portraitUrl: draft.portraitUrl ?? '',
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    ac: cls === 'Fighter' ? 16 : cls === 'Rogue' ? 14 : 12,
    stats: draft.stats ?? CLASS_CONFIG[cls].defaultStats,
    inventory: cls === 'Fighter' ? ['Iron Sword', 'Shield', 'Healing Potion'] :
               cls === 'Mage'    ? ['Staff', 'Spellbook', 'Mana Potion'] :
               cls === 'Rogue'   ? ['Daggers x2', 'Lockpicks', 'Smoke Bomb'] :
                                   ['Longbow', 'Quiver (20)', 'Hunting Knife'],
    activeEffects: [],
  }
}

interface Props {
  index: number
  theme: Theme
  onChange: (draft: Partial<Character>) => void
  initialValue?: Partial<Character>
}

export function CharacterForm({ index, theme, onChange, initialValue = {} }: Props) {
  const [name, setName]           = useState(initialValue.name ?? '')
  const [cls, setCls]             = useState<CharacterClass | null>(initialValue.class ?? null)
  const [backstory, setBackstory] = useState(initialValue.backstory ?? '')
  const [portraitUrl, setPortraitUrl] = useState(initialValue.portraitUrl ?? '')
  const [stats, setStats]         = useState<CharacterStats>(initialValue.stats ?? DEFAULT_STATS)
  const [showStats, setShowStats] = useState(true)
  const [genLoading, setGenLoading] = useState(false)
  const settings = useSettingsStore()

  useEffect(() => {
    onChange({ name: name.trim(), class: cls ?? undefined, backstory, portraitUrl, stats })
  }, [name, cls, backstory, portraitUrl, stats])

  const handleClassSelect = (c: CharacterClass) => {
    setCls(c)
    setStats(CLASS_CONFIG[c].defaultStats)
  }

  const remaining = POINT_BUDGET - totalSpent(stats)

  const adjustStat = (key: keyof CharacterStats, delta: number) => {
    setStats(prev => {
      const cur = prev[key]
      const next = cur + delta
      if (next < BASE_STAT || next > 15) return prev
      const cost = statCost(next) - statCost(cur)
      if (cost > 0 && cost > remaining) return prev
      return { ...prev, [key]: next }
    })
  }

  const handleGenBackstory = async () => {
    const apiKey = settings.getApiKey()
    if (!apiKey) { setBackstory('[Set your API key in Settings to generate backstory]'); return }
    if (!cls) return
    setGenLoading(true)
    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{ role: 'user', content: `Write a 2-sentence character backstory for a ${cls} in a ${theme.replace('_', ' ')} RPG setting. Name: ${name || 'a hero'}. Be evocative and specific. No meta-commentary, just the backstory.` }],
      })
      const text = resp.content.find(b => b.type === 'text')
      if (text?.type === 'text') setBackstory(text.text)
    } catch (e) { console.error(e) }
    finally { setGenLoading(false) }
  }

  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl p-5 space-y-5">
      <div className="text-sm text-gray-400 font-sans uppercase tracking-wider">Player {index + 1}</div>

      {/* Name */}
      <div>
        <label htmlFor={`name-${index}`} className="block text-xs font-sans text-gray-400 uppercase tracking-wider mb-1.5">
          Character Name
        </label>
        <input
          id={`name-${index}`}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter a name..."
          className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors"
        />
      </div>

      {/* Class */}
      <div>
        <div className="text-xs font-sans text-gray-400 uppercase tracking-wider mb-2">Class</div>
        <div className="grid grid-cols-2 gap-2">
          {CLASSES.map(c => {
            const cfg = CLASS_CONFIG[c]
            const selected = cls === c
            return (
              <button
                key={c}
                onClick={() => handleClassSelect(c)}
                className={[
                  'flex items-center gap-2 p-3 rounded-lg border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                  selected
                    ? 'bg-violet-600/20 border-violet-500 text-violet-200'
                    : 'bg-[#0f0f1a] border-[#2d2d4e] text-gray-300 hover:border-[#4d4d7e] hover:bg-[#16213e]',
                ].join(' ')}
                aria-pressed={selected}
              >
                <span className={selected ? 'text-violet-400' : 'text-gray-500'}>{cfg.icon}</span>
                <div>
                  <div className="text-sm font-medium">{c}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{cfg.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      {cls && (
        <div>
          <button
            onClick={() => setShowStats(v => !v)}
            className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors w-full"
          >
            <span>Ability Scores</span>
            {showStats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span className={`ml-auto normal-case tracking-normal font-mono text-xs ${remaining <= 0 ? 'text-gray-600' : remaining <= 5 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {remaining}/27 pts
            </span>
          </button>

          {showStats && (
            <>
              <p className="text-[11px] text-gray-600 mt-1">
                Spend 27 points across 6 stats (8–15). The modifier (mod) is the bonus used on dice rolls.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {STAT_LABELS.map(({ key, abbr }) => {
                  const val = stats[key]
                  const cost = statCost(val)
                  const nextCost = statCost(val + 1) - cost
                  const canInc = val < 15 && remaining >= nextCost
                  const canDec = val > BASE_STAT
                  const mod = statMod(val)
                  const modPositive = !mod.startsWith('-')
                  return (
                    <div key={key} className="bg-[#0f0f1a] border border-[#2d2d4e] rounded-lg p-2 flex flex-col items-center gap-0.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{abbr}</span>
                      <div className="flex items-center gap-1 my-0.5">
                        <button
                          onClick={() => adjustStat(key, -1)}
                          disabled={!canDec}
                          className="w-5 h-5 rounded text-gray-400 hover:text-white hover:bg-white/10 text-xs flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Decrease ${abbr}`}
                        >−</button>
                        <span className="text-white font-bold text-sm w-6 text-center">{val}</span>
                        <button
                          onClick={() => adjustStat(key, 1)}
                          disabled={!canInc}
                          className="w-5 h-5 rounded text-gray-400 hover:text-white hover:bg-white/10 text-xs flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Increase ${abbr}`}
                        >+</button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold ${modPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          mod {mod}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-700 font-mono">{cost}pt</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Backstory */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={`backstory-${index}`} className="text-xs font-sans text-gray-400 uppercase tracking-wider">
            Backstory
          </label>
          <Button variant="ghost" size="sm" onClick={handleGenBackstory} loading={genLoading} className="text-xs">
            <Sparkles size={12} />
            Generate with AI
          </Button>
        </div>
        <textarea
          id={`backstory-${index}`}
          value={backstory}
          onChange={e => setBackstory(e.target.value)}
          placeholder="Who is this character? What drives them..."
          rows={3}
          className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors leading-relaxed"
        />
      </div>

      {/* Portrait */}
      {cls && (
        <CharacterPortrait
          character={buildCharacterFromDraft({ name, class: cls, backstory, portraitUrl, stats })}
          theme={theme}
          onPortraitGenerated={setPortraitUrl}
        />
      )}

    </div>
  )
}

void React
