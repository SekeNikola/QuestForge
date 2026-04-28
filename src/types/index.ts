// ─── Enums / Literals ────────────────────────────────────────────────────────

export type CharacterClass = 'Fighter' | 'Mage' | 'Rogue' | 'Ranger'

export type Theme =
  | 'dark_fantasy'
  | 'lego_universe'
  | 'space_odyssey'
  | 'pirate_seas'
  | 'horror_manor'

export type QuestStatus = 'active' | 'completed' | 'failed'

export type NPCRelation = 'ally' | 'neutral' | 'hostile'

export type CombatResult = 'hit' | 'miss' | 'crit' | 'save' | 'fail' | 'death' | 'defeated' | 'fled'

export type ResponseLength = 'compact' | 'normal' | 'verbose'

export type MessageRole = 'user' | 'assistant'

export type CellType = 'unexplored' | 'room' | 'corridor' | 'current' | 'poi'

// ─── Character ───────────────────────────────────────────────────────────────

export interface CharacterStats {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface Character {
  id: string                    // UUID
  name: string
  class: CharacterClass
  backstory: string
  portraitUrl: string           // Pollinations.ai URL or placeholder data URI
  level: number
  xp: number
  hp: number
  maxHp: number
  ac: number
  stats: CharacterStats
  inventory: string[]
  activeEffects: string[]       // e.g. "Poisoned", "Blessed"
}

// ─── Scene Objects ───────────────────────────────────────────────────────────

export type SceneProximity = 'adjacent' | 'near' | 'medium' | 'far' | 'distant'
export type SceneDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'center'

export interface SceneObject {
  id: string
  name: string
  icon: string
  type?: 'npc' | 'object' | 'exit'
  proximity: SceneProximity
  direction: SceneDirection
  interacted?: boolean
}

// ─── Quest / NPC ─────────────────────────────────────────────────────────────

export interface Quest {
  id: string
  name: string
  description: string
  status: QuestStatus
  giver: string                 // NPC name or "Unknown"
}

export interface NPC {
  id: string
  name: string
  relation: NPCRelation
  lastSeen: string              // location string
  notes: string                 // brief descriptor, e.g. "suspicious, knows about vault"
}

// ─── Combat ──────────────────────────────────────────────────────────────────

export interface Combatant {
  id: string
  name: string
  isPlayer: boolean
  hp: number
  maxHp: number
  ac: number
  initiative: number
  isDefeated: boolean
}

export interface CombatantRef {
  id: string
  initiative: number
}

export interface CombatEntry {
  id: string                    // UUID for React key
  round: number
  actorId: string
  actorName: string
  targetId: string
  targetName: string
  action: string                // "attacks", "casts Fireball", "attempts to flee"
  roll?: number                 // raw d20 result
  modifier?: number
  total?: number                // roll + modifier
  dc?: number                   // save DC if applicable
  result: CombatResult
  damage?: number
  hpAfter?: number
  hpMax?: number
  narrative: string             // one-line flavour text
  timestamp: number
}

export interface CombatState {
  active: boolean
  round: number
  turnOrder: CombatantRef[]     // sorted by initiative descending
  currentTurnIndex: number
  combatants: Combatant[]
  log: CombatEntry[]
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export interface MapCell {
  x: number
  y: number
  type: CellType
  label?: string                // room name, POI name
  explored: boolean
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface MessageEntry {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  imageUrl?: string             // if scene illustration was generated for this message
}

// ─── Session Stats ───────────────────────────────────────────────────────────

export interface SessionStats {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  allTimeInputTokens: number    // read from localStorage on init
  allTimeOutputTokens: number
  turnCount: number
}

// ─── API Settings ────────────────────────────────────────────────────────────

export interface ApiSettings {
  // apiKey is NOT stored here — kept in sessionStorage only
  model: 'claude-sonnet-4-6'
  responseLength: ResponseLength
  maxTokensMap: {
    compact: number
    normal: number
    verbose: number
  }
}

// ─── Kids Mode ───────────────────────────────────────────────────────────────

export interface KidsMode {
  enabled: boolean
  confirmedDisable: boolean     // true after user confirms the disable modal
}

// ─── Game State (root) ───────────────────────────────────────────────────────

export interface GameState {
  campaignId: string | null     // null = no active campaign
  theme: Theme | null
  kidsMode: boolean
  players: Character[]
  currentLocation: string
  quests: Quest[]
  npcs: NPC[]
  sceneObjects: SceneObject[]
  sessionEvents: string[]       // ring buffer, max 10
  messages: MessageEntry[]      // capped at last 40 (20 pairs) for API; full history in localStorage
  combatState: CombatState | null
  map: MapCell[][]
  sessionStats: SessionStats
  createdAt: number
  updatedAt: number
}

// ─── Memory JSON (API shape) ──────────────────────────────────────────────────

export interface MemoryJSON {
  world: Theme
  location: string
  round: number
  players: Array<{
    name: string
    hp: number
    maxHp: number
    level: number
    class: CharacterClass
  }>
  quests?: Array<{ name: string; status: QuestStatus }>
  npcs?: Array<{ name: string; relation: NPCRelation; lastSeen: string }>
  inventory?: string[]
  recentEvents?: string[]
  kidsMode: boolean
  combatActive: boolean
}

// ─── AI Response Parser ───────────────────────────────────────────────────────

export type StatKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface SkillCheck {
  skill: string
  stat: StatKey
  dc: number
  description?: string
}

export interface ParsedAIResponse {
  narrative: string
  actions: string[]
  memoryPatch: Partial<Pick<GameState, 'currentLocation' | 'quests' | 'npcs' | 'sessionEvents' | 'sceneObjects'>> | null
  xpGained: number
  combatEntry: Omit<CombatEntry, 'id' | 'timestamp'> | null
  combatStart: boolean
  combatEnemyCount: number  // from [COMBAT_START: N], 0 if unspecified
  combatEnd: boolean        // from [COMBAT_END] — flee, surrender, or escape
  skillCheck: SkillCheck | null
}

// ─── All-time stats (localStorage shape) ─────────────────────────────────────

export interface AllTimeStats {
  inputTokens: number
  outputTokens: number
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

export interface SupabaseSettings {
  url: string
  anonKey: string
}

export interface CampaignRow {
  id: string
  campaign_id: string
  display_name: string
  theme: string
  kids_mode: boolean
  state: GameState
  message_count: number
  created_at: string
  updated_at: string
}
