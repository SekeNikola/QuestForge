import { useState } from 'react'
import type { Character, Quest, NPC } from '../../types/index'
import { HPBar } from '../ui/HPBar'
import { Shield, Package, Scroll, Users, ChevronDown, Sparkles, BookOpen, Coins } from 'lucide-react'

// ─── Class abilities & spells ─────────────────────────────────────────────────

const CLASS_ABILITIES: Record<string, Array<{ name: string; desc: string; type?: 'passive' | 'action' | 'bonus' | 'reaction' | 'cantrip' | 'spell' }>> = {
  Fighter: [
    { name: 'Second Wind',    type: 'bonus',    desc: 'Heal 1d10 + level HP. Recharges on short rest.' },
    { name: 'Action Surge',   type: 'action',   desc: 'Take one additional action on your turn. Once per short rest.' },
    { name: 'Fighting Style', type: 'passive',  desc: '+2 to attack rolls with chosen style: Archery, Defense (+1 AC), Dueling, or Great Weapon.' },
    { name: 'Extra Attack',   type: 'passive',  desc: 'Attack twice whenever you take the Attack action (unlocks at level 5).' },
    { name: 'Indomitable',    type: 'passive',  desc: 'Reroll a failed saving throw once per long rest (level 9).' },
  ],
  Mage: [
    { name: 'Fire Bolt',       type: 'cantrip', desc: 'Ranged spell attack, 1d10 fire damage. Range 120 ft. No slot needed.' },
    { name: 'Mage Hand',       type: 'cantrip', desc: 'Spectral hand that can manipulate objects up to 10 lb within 30 ft.' },
    { name: 'Prestidigitation',type: 'cantrip', desc: 'Minor magical tricks: lights, sounds, smells, illusions. Lasts 1 hour.' },
    { name: 'Magic Missile',   type: 'spell',   desc: '1st level — Three glowing darts, each deals 1d4+1 force damage. Auto-hits.' },
    { name: 'Shield',          type: 'reaction',desc: '1st level — +5 AC until start of your next turn, triggered when hit.' },
    { name: 'Mage Armor',      type: 'spell',   desc: '1st level — AC becomes 13 + DEX modifier for 8 hours (no armor required).' },
    { name: 'Sleep',           type: 'spell',   desc: '1st level — 5d8 HP of creatures in 20 ft radius fall unconscious. Starts with weakest.' },
    { name: 'Burning Hands',   type: 'spell',   desc: '1st level — 15 ft cone, 3d6 fire damage (DEX save halves). Slots: 2×1st.' },
    { name: 'Arcane Recovery', type: 'passive', desc: 'Short rest: recover spell slots totalling up to half your level (min 1).' },
  ],
  Rogue: [
    { name: 'Sneak Attack',    type: 'passive', desc: '1d6 extra damage (scales with level) when you have advantage OR an ally flanks the target.' },
    { name: 'Cunning Action',  type: 'bonus',   desc: 'Bonus action to Dash, Disengage, or Hide every turn — no cost.' },
    { name: 'Uncanny Dodge',   type: 'reaction',desc: 'Halve the damage from an attack you can see.' },
    { name: 'Evasion',         type: 'passive', desc: 'On a DEX save: no damage on success, half on failure (level 7).' },
    { name: 'Thieves\' Tools', type: 'passive', desc: 'Proficient in picking locks and disarming traps. Add proficiency bonus to checks.' },
  ],
  Ranger: [
    { name: "Hunter's Mark",   type: 'bonus',   desc: 'Concentration (1 hr) — +1d6 damage to marked target, advantage to track it.' },
    { name: 'Favored Enemy',   type: 'passive', desc: 'Advantage tracking chosen enemy type; +2 damage against them.' },
    { name: 'Colossus Slayer', type: 'passive', desc: 'Once per turn: +1d8 damage against a target already below max HP.' },
    { name: 'Longbow Shot',    type: 'action',  desc: '1d8 + DEX piercing. Range 150/600 ft.' },
    { name: 'Volley',          type: 'action',  desc: 'Fire an arrow at every creature in a 10 ft radius. One attack roll each.' },
    { name: 'Cure Wounds',     type: 'spell',   desc: '1st level — Touch: restore 1d8 + WIS HP. Slots: 2×1st.' },
  ],
}

const SPELL_SLOTS: Record<string, (level: number) => string | null> = {
  Mage:   (lvl) => lvl === 1 ? '2× 1st' : lvl === 2 ? '3× 1st' : lvl === 3 ? '4× 1st, 2× 2nd' : lvl >= 4 ? '4× 1st, 3× 2nd' : null,
  Ranger: (lvl) => lvl < 2 ? null : lvl === 2 ? '2× 1st' : lvl === 3 ? '3× 1st' : lvl >= 4 ? '3× 1st, 1× 2nd' : null,
}

// ─── Item data ────────────────────────────────────────────────────────────────

const ITEM_DATA: Record<string, { desc: string; effect: string }> = {
  'Iron Sword':      { desc: 'Reliable iron blade.',                              effect: '1d6+STR slashing · Versatile (1d8 two-handed)' },
  'Shield':          { desc: 'Round wooden shield with iron boss.',                effect: '+2 AC when equipped' },
  'Healing Potion':  { desc: 'Red herbal liquid in a glass vial.',                 effect: 'Bonus action: restore 2d4+2 HP (avg 7)' },
  'Staff':           { desc: 'Gnarled oak staff with a glowing crystal.',          effect: '1d6+INT damage · +1 to spell attack rolls' },
  'Spellbook':       { desc: 'Leather-bound tome of arcane formulae.',             effect: 'Required to prepare spells after a rest' },
  'Mana Potion':     { desc: 'Shimmering blue liquid.',                            effect: 'Recover your lowest expended spell slot' },
  'Daggers x2':      { desc: 'Balanced throwing daggers.',                         effect: '1d4+DEX piercing · Light, finesse · Throwable 20/60 ft' },
  'Lockpicks':       { desc: 'Slim steel tools for bypassing locks.',              effect: '+2 to Thieves\' Tools checks' },
  'Smoke Bomb':      { desc: 'Clay pot of choking black smoke.',                   effect: '10 ft smoke cloud, 1 min · Heavily obscured' },
  'Longbow':         { desc: 'Tall recurved yew bow.',                             effect: '1d8+DEX piercing · Range 150/600 ft' },
  'Quiver (20)':     { desc: 'Leather quiver, 20 standard arrows.',                effect: 'Ammo for Longbow' },
  'Hunting Knife':   { desc: 'Short single-edged blade.',                          effect: '1d4+STR/DEX slashing · Light, finesse' },
  'Torch':           { desc: 'Wooden torch with cloth wick.',                      effect: 'Illuminates 20 ft for 1 hour' },
  'Rope (50 ft)':    { desc: 'Hempen rope, 50 feet.',                              effect: 'Supports 300 lb · DC 17 to break' },
  'Rations (3)':     { desc: 'Three days of trail food.',                          effect: 'Sustains for 3 days travel' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function proficiencyBonus(level: number) { return 2 + Math.floor((level - 1) / 4) }

function parseGold(inventory: string[]): { gp: number; sp: number; cp: number } | null {
  let gp = 0, sp = 0, cp = 0
  for (const item of inventory) {
    const low = item.toLowerCase()
    const g = low.match(/(\d+)\s*(?:gold|gp)/)
    const s = low.match(/(\d+)\s*(?:silver|sp)/)
    const c = low.match(/(\d+)\s*(?:copper|cp)/)
    if (g) gp += parseInt(g[1])
    if (s) sp += parseInt(s[1])
    if (c) cp += parseInt(c[1])
  }
  return (gp || sp || cp) ? { gp, sp, cp } : null
}

function isGoldItem(item: string) {
  return /(\d+)\s*(gold|gp|silver|sp|copper|cp)/i.test(item)
}

const TYPE_BADGE: Record<string, string> = {
  cantrip:  'bg-sky-900/40 text-sky-300 border-sky-800/40',
  spell:    'bg-violet-900/40 text-violet-300 border-violet-800/40',
  action:   'bg-amber-900/40 text-amber-300 border-amber-800/40',
  bonus:    'bg-green-900/40 text-green-300 border-green-800/40',
  reaction: 'bg-orange-900/40 text-orange-300 border-orange-800/40',
  passive:  'bg-gray-800/60 text-gray-400 border-gray-700/40',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AbilityRow({ name, desc, type }: { name: string; desc: string; type?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left py-1.5 group min-h-[40px] sm:min-h-0">
        {type && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide shrink-0 ${TYPE_BADGE[type] ?? TYPE_BADGE.passive}`}>
            {type}
          </span>
        )}
        <span className="text-sm sm:text-xs text-gray-200 group-hover:text-white transition-colors flex-1">{name}</span>
        <ChevronDown size={13} className={`text-gray-600 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-xs text-gray-500 ml-1 mb-2 pr-1 leading-snug">{desc}</p>}
    </div>
  )
}

function InventoryRow({ item }: { item: string }) {
  const [open, setOpen] = useState(false)
  const data = ITEM_DATA[item]
  return (
    <div>
      <button
        onClick={() => data && setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-white/5 group transition-colors min-h-[40px] sm:min-h-0"
      >
        <span className="text-gray-500 text-sm">›</span>
        <span className="text-sm sm:text-xs text-gray-300 flex-1">{item}</span>
        {data && <ChevronDown size={13} className={`text-gray-600 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && data && (
        <div className="mx-2 mb-2 px-3 py-2 bg-[#0f0f1a] border border-[#2d2d4e] rounded-lg">
          <p className="text-xs text-gray-400 leading-snug">{data.desc}</p>
          <p className="text-xs text-violet-300 mt-1 font-mono leading-snug">{data.effect}</p>
        </div>
      )}
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: number }) {
  const mod = Math.floor((value - 10) / 2)
  return (
    <div className="flex flex-col items-center bg-[#0f0f1a] rounded-md px-2 py-1.5 min-w-0">
      <span className="text-gray-500 text-[10px] uppercase tracking-wider">{label}</span>
      <span className="text-white font-mono text-sm font-bold">{value}</span>
      <span className="text-gray-400 text-[10px] font-mono">{mod >= 0 ? `+${mod}` : mod}</span>
    </div>
  )
}

// ─── Character card ───────────────────────────────────────────────────────────

function CharacterCard({ character }: { character: Character }) {
  const [showBackstory, setShowBackstory] = useState(false)
  const abilities = CLASS_ABILITIES[character.class] ?? []
  const spellSlotFn = SPELL_SLOTS[character.class]
  const spellSlots = spellSlotFn ? spellSlotFn(character.level) : null
  const prof = proficiencyBonus(character.level)
  const dexMod = Math.floor((character.stats.dex - 10) / 2)
  const gold = parseGold(character.inventory)
  const nonGoldInventory = character.inventory.filter(i => !isGoldItem(i))
  const spells = abilities.filter(a => a.type === 'spell' || a.type === 'cantrip')
  const nonSpellAbilities = abilities.filter(a => a.type !== 'spell' && a.type !== 'cantrip')

  return (
    <div className="border border-[#2d2d4e] rounded-lg bg-[#1a1a2e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        {character.portraitUrl ? (
          <img src={character.portraitUrl} alt={character.name}
            className="w-11 h-11 rounded-full object-cover border border-[#2d2d4e] shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#0f0f1a] border border-[#2d2d4e] flex items-center justify-center text-xl shrink-0">
            {character.class === 'Fighter' ? '⚔️' : character.class === 'Mage' ? '🔮' : character.class === 'Rogue' ? '🗡️' : '🏹'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-sm truncate">{character.name}</div>
          <div className="text-gray-500 text-xs">Level {character.level} {character.class}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-gray-400">
          <Shield size={11} />
          <span>{character.ac}</span>
        </div>
      </div>

      {/* HP bar */}
      <div className="px-3 pb-1">
        <HPBar current={character.hp} max={character.maxHp} label="HP" />
      </div>

      {/* XP bar */}
      {(() => {
        const XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000]
        const xp = character.xp ?? 0
        const lvl = character.level
        const cur = XP[lvl - 1] ?? 0
        const next = XP[lvl] ?? XP[XP.length - 1]!
        const pct = lvl >= 10 ? 100 : Math.min(100, ((xp - cur) / (next - cur)) * 100)
        return (
          <div className="px-3 pb-2">
            <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
              <span>XP</span><span>{lvl >= 10 ? 'MAX' : `${xp} / ${next}`}</span>
            </div>
            <div className="h-1 bg-[#0f0f1a] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
            </div>
          </div>
        )
      })()}

      {/* Combat quick-stats row */}
      <div className="px-3 pb-2 flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="text-gray-600">PROF</span> <span className="text-gray-200 font-mono">+{prof}</span></span>
        <span className="text-gray-700">·</span>
        <span className="flex items-center gap-1"><span className="text-gray-600">INIT</span> <span className="text-gray-200 font-mono">{dexMod >= 0 ? `+${dexMod}` : dexMod}</span></span>
        <span className="text-gray-700">·</span>
        <span className="flex items-center gap-1"><span className="text-gray-600">SPD</span> <span className="text-gray-200 font-mono">30 ft</span></span>
        {spellSlots && (
          <>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1"><span className="text-gray-600">SLOTS</span> <span className="text-violet-300 font-mono">{spellSlots}</span></span>
          </>
        )}
      </div>

      {/* Ability scores */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-6 gap-1">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(s => (
            <StatBlock key={s} label={s} value={character.stats[s]} />
          ))}
        </div>
      </div>

      {/* Gold / currency */}
      {gold && (
        <div className="px-3 pb-2 border-t border-[#2d2d4e] pt-2">
          <div className="flex items-center gap-2 mb-1.5 text-[10px] text-gray-500 uppercase tracking-wider">
            <Coins size={11} />
            <span>Wealth</span>
          </div>
          <div className="flex gap-3 text-sm font-mono">
            {gold.gp > 0 && <span><span className="text-amber-400 font-bold">{gold.gp}</span><span className="text-gray-600 text-xs"> gp</span></span>}
            {gold.sp > 0 && <span><span className="text-gray-300 font-bold">{gold.sp}</span><span className="text-gray-600 text-xs"> sp</span></span>}
            {gold.cp > 0 && <span><span className="text-orange-700 font-bold">{gold.cp}</span><span className="text-gray-600 text-xs"> cp</span></span>}
          </div>
        </div>
      )}

      {/* Active effects */}
      {character.activeEffects.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {character.activeEffects.map(fx => (
            <span key={fx} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/40">{fx}</span>
          ))}
        </div>
      )}

      {/* Spells */}
      {spells.length > 0 && (
        <div className="px-3 pb-2 border-t border-[#2d2d4e] pt-2">
          <div className="flex items-center gap-2 mb-1.5 text-[10px] text-gray-500 uppercase tracking-wider">
            <Sparkles size={11} />
            <span>Spells & Cantrips</span>
          </div>
          <div className="space-y-0.5">
            {spells.map(a => <AbilityRow key={a.name} name={a.name} desc={a.desc} type={a.type} />)}
          </div>
        </div>
      )}

      {/* Class abilities */}
      {nonSpellAbilities.length > 0 && (
        <div className="px-3 pb-2 border-t border-[#2d2d4e] pt-2">
          <div className="flex items-center gap-2 mb-1.5 text-[10px] text-gray-500 uppercase tracking-wider">
            <span>Abilities</span>
          </div>
          <div className="space-y-0.5">
            {nonSpellAbilities.map(a => <AbilityRow key={a.name} name={a.name} desc={a.desc} type={a.type} />)}
          </div>
        </div>
      )}

      {/* Backstory */}
      {character.backstory && (
        <div className="px-3 pb-3 border-t border-[#2d2d4e] pt-2">
          <button
            onClick={() => setShowBackstory(v => !v)}
            className="flex items-center gap-2 w-full text-left text-[10px] text-gray-500 uppercase tracking-wider mb-1 hover:text-gray-400"
          >
            <BookOpen size={11} />
            <span>Backstory</span>
            <ChevronDown size={11} className={`ml-auto transition-transform ${showBackstory ? 'rotate-180' : ''}`} />
          </button>
          {showBackstory && (
            <p className="text-xs text-gray-500 leading-relaxed">{character.backstory}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface CharacterPanelProps { characters: Character[]; quests: Quest[]; npcs: NPC[] }

export function CharacterPanel({ characters, quests, npcs }: CharacterPanelProps) {
  const activeQuests    = quests.filter(q => q.status === 'active')
  const finishedQuests  = quests.filter(q => q.status !== 'active')
  const knownNpcs       = npcs.filter(n => n.relation !== 'neutral' || n.notes)

  // Aggregate non-gold inventory from all characters
  const inventory = characters.flatMap(c => c.inventory.filter(i => !isGoldItem(i)))

  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-4">
      {/* Character cards */}
      <div className="space-y-3">
        {characters.map(c => <CharacterCard key={c.id} character={c} />)}
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 uppercase tracking-wider">
            <Package size={13} /><span>Inventory</span>
            <span className="text-gray-600 normal-case tracking-normal font-normal ml-auto">{inventory.length} items</span>
          </div>
          <div className="space-y-0.5">
            {inventory.map((item, i) => <InventoryRow key={`${item}-${i}`} item={item} />)}
          </div>
        </div>
      )}

      {/* Active quests */}
      {activeQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 uppercase tracking-wider">
            <Scroll size={12} /><span>Active Quests</span>
          </div>
          <div className="space-y-1.5">
            {activeQuests.map(q => (
              <div key={q.id} className="bg-[#1a1a2e] border border-amber-800/30 rounded-md px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-amber-300">{q.name}</span>
                  {q.giver && q.giver !== 'Unknown' && (
                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">from {q.giver}</span>
                  )}
                </div>
                {q.description && <p className="text-[11px] text-gray-500 mt-0.5 ml-3 leading-snug">{q.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed / failed quests */}
      {finishedQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 uppercase tracking-wider">
            <Scroll size={12} /><span>Quest History</span>
          </div>
          <div className="space-y-1">
            {finishedQuests.map(q => (
              <div key={q.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#12122a]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${q.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500 flex-1">{q.name}</span>
                <span className={`text-[10px] ${q.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                  {q.status === 'completed' ? '✓ Done' : '✗ Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPCs */}
      {knownNpcs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 uppercase tracking-wider">
            <Users size={12} /><span>Known People</span>
          </div>
          <div className="space-y-1.5">
            {knownNpcs.map(npc => (
              <div key={npc.id} className="flex items-start gap-2 px-2 py-1.5 rounded bg-[#12122a]">
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${npc.relation === 'ally' ? 'bg-green-400' : npc.relation === 'hostile' ? 'bg-red-400' : 'bg-gray-600'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-200 font-medium">{npc.name}</span>
                    <span className={`text-[10px] capitalize ${npc.relation === 'ally' ? 'text-green-500' : npc.relation === 'hostile' ? 'text-red-500' : 'text-gray-600'}`}>
                      {npc.relation}
                    </span>
                  </div>
                  {npc.lastSeen && <div className="text-[10px] text-gray-600">Last seen: {npc.lastSeen}</div>}
                  {npc.notes && <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{npc.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quests.length === 0 && npcs.length === 0 && inventory.length === 0 && (
        <p className="text-center text-xs text-gray-600 py-4 italic">Play to discover quests, loot, and people.</p>
      )}
    </div>
  )
}
