import { useState } from 'react'
import type { Character, Quest, NPC } from '../../types/index'
import { HPBar } from '../ui/HPBar'
import { Shield, Package, Scroll, Users, ChevronDown } from 'lucide-react'

const CLASS_ABILITIES: Record<string, Array<{ name: string; desc: string }>> = {
  Fighter: [
    { name: 'Second Wind', desc: 'Bonus action: heal 1d10 + level HP. Recharges on short rest.' },
    { name: 'Action Surge', desc: 'Take one additional action on your turn. Once per short rest.' },
    { name: 'Fighting Style', desc: '+2 to attack rolls. Choose: Archery, Defense (+1 AC), Dueling, or Great Weapon.' },
  ],
  Mage: [
    { name: 'Spellcasting', desc: 'Cast spells using INT modifier. Spell slots: 2× 1st level. Recharge on long rest.' },
    { name: 'Fire Bolt', desc: 'Cantrip — ranged spell attack, 1d10 fire damage. No slot needed. Range 120 ft.' },
    { name: 'Arcane Recovery', desc: 'Short rest: recover spell slots equal to half your level (min 1).' },
  ],
  Rogue: [
    { name: 'Sneak Attack', desc: 'Extra 1d6 damage when you have advantage OR an ally is within 5 ft of the target.' },
    { name: 'Cunning Action', desc: 'Bonus action to Dash, Disengage, or Hide. Every turn, no cost.' },
    { name: 'Uncanny Dodge', desc: 'Reaction: halve attack damage from an attacker you can see.' },
  ],
  Ranger: [
    { name: "Hunter's Mark", desc: 'Concentration — mark a target: +1d6 damage to it, advantage on Survival to track. 1 hr.' },
    { name: 'Favored Enemy', desc: 'Advantage on checks to track chosen enemy type; +2 to damage against them.' },
    { name: 'Colossus Slayer', desc: 'Once per turn: +1d8 damage against a target already below max HP.' },
  ],
}

const ITEM_DATA: Record<string, { desc: string; effect: string }> = {
  'Iron Sword':      { desc: 'Reliable iron blade. Heavy but dependable.',        effect: '1d6+STR slashing · Versatile (1d8 two-handed)' },
  'Shield':          { desc: 'Round wooden shield with iron boss.',                effect: '+2 AC when equipped · Frees one hand only' },
  'Healing Potion':  { desc: 'Red herbal liquid in a glass vial.',                 effect: 'Bonus action: restore 2d4+2 HP (avg 7)' },
  'Staff':           { desc: 'Gnarled oak staff with a glowing crystal.',          effect: '1d6+INT damage · +1 to spell attack rolls' },
  'Spellbook':       { desc: 'Leather-bound tome of arcane formulae.',             effect: 'Required to prepare spells after a rest · Holds all known spells' },
  'Mana Potion':     { desc: 'Shimmering blue liquid.',                            effect: 'Recover your lowest expended spell slot' },
  'Daggers x2':      { desc: 'Balanced throwing daggers, perfect pair.',           effect: '1d4+DEX piercing · Light, finesse · Throwable 20/60 ft' },
  'Lockpicks':       { desc: 'Slim steel tools for bypassing locks.',              effect: '+2 to Thieves\' Tools checks · Open locks and disarm traps' },
  'Smoke Bomb':      { desc: 'Clay pot of choking black smoke.',                   effect: 'Action: 10 ft smoke cloud, 1 minute · Heavily obscured inside' },
  'Longbow':         { desc: 'Tall recurved yew bow.',                             effect: '1d8+DEX piercing · Range 150/600 ft · Two-handed' },
  'Quiver (20)':     { desc: 'Leather quiver, 20 standard arrows.',                effect: 'Provides ammo for Longbow · Standard arrows' },
  'Hunting Knife':   { desc: 'Short single-edged blade, close-quarters use.',      effect: '1d4+STR/DEX slashing · Light, finesse' },
}

function AbilityRow({ name, desc }: { name: string; desc: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 w-full text-left py-0.5 group"
      >
        <span className="text-violet-500 text-[10px]">✦</span>
        <span className="text-xs text-violet-300 group-hover:text-violet-200 transition-colors flex-1">{name}</span>
        <ChevronDown size={10} className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-[11px] text-gray-500 ml-4 mb-1 pr-1 leading-snug">{desc}</p>
      )}
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
        className="flex items-center gap-2 w-full text-left px-2 py-0.5 rounded hover:bg-white/5 group transition-colors"
      >
        <span className="text-gray-600">›</span>
        <span className="text-xs text-gray-300 flex-1">{item}</span>
        {data && (
          <ChevronDown size={10} className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && data && (
        <div className="mx-2 mb-1.5 px-2.5 py-2 bg-[#0f0f1a] border border-[#2d2d4e] rounded-lg">
          <p className="text-[11px] text-gray-400 leading-snug">{data.desc}</p>
          <p className="text-[11px] text-violet-300 mt-1 font-mono leading-snug">{data.effect}</p>
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

function CharacterCard({ character }: { character: Character }) {
  const abilities = CLASS_ABILITIES[character.class] ?? []

  return (
    <div className="border border-[#2d2d4e] rounded-lg bg-[#1a1a2e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        {character.portraitUrl ? (
          <img src={character.portraitUrl} alt={character.name}
            className="w-10 h-10 rounded-full object-cover border border-[#2d2d4e] shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0f0f1a] border border-[#2d2d4e] flex items-center justify-center text-lg shrink-0">
            {character.class === 'Fighter' ? '⚔️' : character.class === 'Mage' ? '🔮' : character.class === 'Rogue' ? '🗡️' : '🏹'}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-white text-sm truncate">{character.name}</div>
          <div className="text-gray-500 text-xs">Lv.{character.level} {character.class}</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs font-mono text-gray-400 shrink-0">
          <Shield size={11} />
          <span>{character.ac}</span>
        </div>
      </div>

      {/* HP bar */}
      <div className="px-3 pb-2">
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
              <span>XP</span>
              <span>{lvl >= 10 ? 'MAX' : `${xp} / ${next}`}</span>
            </div>
            <div className="h-1 bg-[#0f0f1a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
              />
            </div>
          </div>
        )
      })()}

      {/* Stats */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-6 gap-1">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(s => (
            <StatBlock key={s} label={s} value={character.stats[s]} />
          ))}
        </div>
      </div>

      {/* Abilities */}
      {abilities.length > 0 && (
        <div className="px-3 pb-2 border-t border-[#2d2d4e] pt-2">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Abilities</div>
          {abilities.map(a => <AbilityRow key={a.name} name={a.name} desc={a.desc} />)}
        </div>
      )}

      {/* Effects */}
      {character.activeEffects.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {character.activeEffects.map(fx => (
            <span key={fx} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/40">
              {fx}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

interface CharacterPanelProps { characters: Character[]; quests: Quest[]; npcs: NPC[] }

export function CharacterPanel({ characters, quests, npcs }: CharacterPanelProps) {
  const activeQuests = quests.filter(q => q.status === 'active')
  const knownNpcs = npcs.filter(n => n.relation !== 'neutral' || n.notes)

  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-4">
      <div className="space-y-3">
        {characters.map(c => <CharacterCard key={c.id} character={c} />)}
      </div>

      {/* Inventory */}
      {characters[0] && characters[0].inventory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-sans text-gray-400 uppercase tracking-wider">
            <Package size={12} />
            <span>Inventory</span>
          </div>
          <div className="space-y-0.5">
            {characters[0].inventory.map(item => <InventoryRow key={item} item={item} />)}
          </div>
        </div>
      )}

      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-sans text-gray-400 uppercase tracking-wider">
            <Scroll size={12} />
            <span>Quests</span>
          </div>
          <div className="space-y-1.5">
            {activeQuests.map(q => (
              <div key={q.id} className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-md px-2.5 py-2">
                <div className="text-xs font-medium text-amber-300">{q.name}</div>
                {q.description && <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{q.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPCs */}
      {knownNpcs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-sans text-gray-400 uppercase tracking-wider">
            <Users size={12} />
            <span>Known NPCs</span>
          </div>
          <div className="space-y-1">
            {knownNpcs.map(npc => (
              <div key={npc.id} className="flex items-start gap-2 text-xs px-1">
                <span className={npc.relation === 'ally' ? 'text-green-400' : npc.relation === 'hostile' ? 'text-red-400' : 'text-gray-500'}>●</span>
                <div>
                  <span className="text-gray-300">{npc.name}</span>
                  {npc.lastSeen && <span className="text-gray-600"> · {npc.lastSeen}</span>}
                  {npc.notes && <div className="text-gray-600 text-[11px] leading-snug">{npc.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
