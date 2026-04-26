# QuestForge — Interfaces & Contracts

All types, API shapes, prompt templates, and hook signatures. Developers implement exactly what is defined here.

---

## 1. TypeScript Types

File: `src/types/index.ts`

```ts
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
  hp: number
  maxHp: number
  ac: number
  stats: CharacterStats
  inventory: string[]
  activeEffects: string[]       // e.g. "Poisoned", "Blessed"
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
  model: 'claude-sonnet-4-5'
  responseLength: ResponseLength
  maxTokensMap: {
    compact: 300
    normal: 600
    verbose: 1200
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
  sessionEvents: string[]       // ring buffer, max 10
  messages: MessageEntry[]      // capped at last 40 (20 pairs) for API; full history in localStorage
  combatState: CombatState | null
  map: MapCell[][]
  sessionStats: SessionStats
  createdAt: number
  updatedAt: number
}
```

---

## 2. Claude API Message Format

Every call to the Claude API follows this exact shape.

### SDK call signature
```ts
client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: settings.maxTokensMap[settings.responseLength],
  system: buildSystemPrompt(state.theme!, state.kidsMode),
  messages: [
    // ... previous conversation pairs from state.messages (last 20 pairs max)
    // ... then the new user message (always last):
    {
      role: 'user',
      content: buildUserMessage(userInput, state)
    }
  ]
})
```

### buildUserMessage output format
```
<memory>
{"world":"dark_fantasy","location":"Goblin Warren, Level 2","round":5,"players":[{"name":"Arvid","hp":22,"maxHp":30,"level":3,"class":"Fighter"}],"quests":[{"name":"Find the Amulet","status":"active"}],"npcs":[{"name":"Gruff","relation":"ally","lastSeen":"tavern"}],"inventory":["iron sword","healing potion x2"],"recentEvents":["Defeated goblin patrol","Found secret door"],"kidsMode":false,"combatActive":false}
</memory>

I try to sneak past the goblin guard.
```

Rules:
- `<memory>` block is always the first thing in the user message
- Memory JSON is minified (no whitespace) to minimize tokens
- Empty arrays (`quests: []`, `npcs: []`) are omitted entirely from the JSON
- Player's actual input follows on a new line after the `</memory>` tag

### Memory JSON schema
```ts
interface MemoryJSON {
  world: Theme
  location: string
  round: number                 // turn count
  players: Array<{
    name: string
    hp: number
    maxHp: number
    level: number
    class: CharacterClass
  }>
  quests?: Array<{ name: string; status: QuestStatus }>       // omit if empty
  npcs?: Array<{ name: string; relation: NPCRelation; lastSeen: string }>  // omit if empty
  inventory?: string[]          // omit if empty
  recentEvents?: string[]       // last 10; omit if empty
  kidsMode: boolean
  combatActive: boolean
}
```

### Expected AI response format
The DM system prompt instructs Claude to include structured tags in its response. The response parser in `useClaude.ts` extracts these:

```
[Narrative prose — 1 to 3 sentences max]

[ACTIONS: Attack the goblin | Sneak around | Talk your way out]

[MEMORY_UPDATE: {"location": "Guard Room", "recentEvents": ["Snuck past goblin patrol"]}]
```

- `[ACTIONS: ...]` — pipe-separated list of 3 suggested actions. Stripped before displaying narrative.
- `[MEMORY_UPDATE: {...}]` — partial JSON patch applied to `GameState` via `updateMemory()`. Stripped before display.
- Both tags are optional — AI may omit them if context doesn't warrant.
- Everything outside these tags is the displayable narrative.

### Combat-specific response format
When `combatActive: true`, Claude responds with structured combat data:

```
[COMBAT: {"actor":"Goblin Archer","action":"fires arrow","roll":14,"modifier":2,"total":16,"targetAC":15,"result":"hit","damage":5,"targetId":"player-1","hpAfter":17,"hpMax":22,"narrative":"The arrow grazes your shoulder."}]

[ACTIONS: Strike back hard | Take cover | Cast healing spell]
```

---

## 3. System Prompt Templates

### Standard DM Prompt
File: `src/utils/buildSystemPrompt.ts`

```
You are a skilled, creative Dungeon Master running a {THEME} tabletop RPG.

RULES:
- Narrate in second person ("you see", "you hear"). Max 3 sentences per beat.
- Never recap what just happened. Drive the story forward.
- Proactively introduce NPC decisions, world events, and complications — don't wait for the player.
- Respect the memory JSON sent with each message. Never contradict it.
- Maintain consistent NPC personalities and world logic across turns.

RESPONSE FORMAT:
- End every response with: [ACTIONS: option1 | option2 | option3]
- If location, quests, or NPCs changed: append [MEMORY_UPDATE: {partial JSON}]
- When combat starts: begin with [COMBAT_START] then the first combat entry
- During combat: respond with [COMBAT: {json}] for each enemy turn

TONE: {THEME_FLAVOUR}
```

Theme flavour lines (injected at `{THEME_FLAVOUR}`):
- `dark_fantasy`: "Grim, atmospheric. Danger is real. Death is possible. Prose is terse and evocative."
- `lego_universe`: "Playful, inventive, colourful. Everything is made of bricks. Humour is welcome."
- `space_odyssey`: "Sci-fi wonder mixed with tension. Think Alien meets Mass Effect. Terse techno-speak."
- `pirate_seas`: "Swashbuckling, salty, adventurous. Sea metaphors. NPCs have strong accents."
- `horror_manor`: "Slow dread. Atmosphere over gore. Imply horror, don't describe it graphically."

### Kids Mode DM Prompt
Replaces the standard prompt entirely:

```
You are a cheerful, encouraging Dungeon Master running a {THEME} adventure for children.

RULES:
- Narrate in second person. Max 3 sentences per beat. Keep language simple and fun.
- Enemies never die — they flee, surrender, or get "knocked out" and wake up later.
- No blood, gore, dark magic, disturbing characters, or scary descriptions.
- Violence is cartoon/slapstick: enemies trip, bump into walls, drop their weapons.
- Themes: friendship, teamwork, puzzle-solving, adventure, discovery.
- Loot: coins, food, funny items — never body parts or dark artefacts.
- Language is G-rated. Exclamation points are your friend!

RESPONSE FORMAT:
- End every response with: [ACTIONS: option1 | option2 | option3]
- If location, quests, or NPCs changed: append [MEMORY_UPDATE: {partial JSON}]
- During combat: respond with [COMBAT: {json}] — result must be "defeated" or "fled", never "death"

TONE: {THEME_FLAVOUR_KIDS}
```

Kids tone overrides:
- `dark_fantasy` → `"Brave heroes on a classic quest. Danger is exciting, not scary. Think animated film."`
- `horror_manor` → `"A silly mystery mansion full of bumbling ghosts and secret passages. Spooky but never scary."`
- All others use standard flavour lines.

---

## 4. Pollinations.ai URL Pattern

Base URL: `https://image.pollinations.ai/prompt/{encoded_prompt}`

Parameters:
| Param | Value | Notes |
|---|---|---|
| `width` | `512` | Fixed for portraits and scenes |
| `height` | `512` | Fixed |
| `nologo` | `true` | Remove Pollinations watermark |
| `seed` | `{integer}` | Random int for variation; stored so "regenerate" uses a new seed |
| `model` | `flux` | Default Pollinations model |

Full example:
```
https://image.pollinations.ai/prompt/RPG%20character%20portrait%2C%20Fighter%2C%20dark%20fantasy%2C%20dramatic%20lighting?width=512&height=512&nologo=true&seed=4829&model=flux
```

### Portrait prompt template
```
RPG character portrait, {class}, {theme_label} setting, {backstory_excerpt}, dramatic lighting, detailed, painterly fantasy art style, no text
```

`theme_label` mapping:
- `dark_fantasy` → "dark medieval fantasy"
- `lego_universe` → "Lego brick world, cartoon style"
- `space_odyssey` → "futuristic sci-fi"
- `pirate_seas` → "swashbuckling pirate"
- `horror_manor` → "gothic horror"

`backstory_excerpt` = first sentence of character backstory, truncated to 60 chars.

### Scene prompt template
```
{theme_label} scene, {current_location}, {last_narration_sentence}, dramatic illustration, detailed, cinematic lighting, no text, no UI
```

`last_narration_sentence` = last sentence of the most recent assistant message, truncated to 80 chars.

---

## 5. localStorage Key Schema

All keys are prefixed `qf:` to avoid collisions.

| Key | Type | Content | Notes |
|---|---|---|---|
| `qf:campaign:{campaignId}` | `GameState` | Full serialised game state | One key per campaign; Zustand persist target |
| `qf:settings` | `{ responseLength, kidsMode, model }` | User preferences | API key intentionally excluded |
| `qf:stats:alltime` | `{ inputTokens, outputTokens }` | Cumulative all-time token usage | Updated after every turn |
| `qf:active_campaign_id` | `string` | UUID of current campaign | Used on reload to resume |

sessionStorage (not localStorage):
| Key | Type | Content |
|---|---|---|
| `qf:api_key` | `string` | User's Claude API key — cleared on tab close |

### Zustand persist config

```ts
// gameStore.ts
persist(
  (set, get) => ({ ... }),
  {
    name: `qf:campaign:${campaignId}`,   // dynamic — set after startCampaign()
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      // Exclude: sessionStats (per-session), combatState.log if > 100 entries
      ...state,
      sessionStats: {
        ...state.sessionStats,
        inputTokens: 0,       // reset on reload
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        turnCount: 0
        // allTime fields preserved
      }
    })
  }
)
```

---

## 6. Hook Interfaces

### useGameState
```ts
interface UseGameState {
  // State
  state: GameState
  activePlayer: Character | null        // first player; null if no campaign
  isInCombat: boolean                   // derived: combatState?.active ?? false

  // Actions
  startCampaign: (theme: Theme, players: Character[], kidsMode: boolean) => void
  appendMessage: (role: MessageRole, content: string) => void
  updatePlayerHP: (playerId: string, delta: number) => void
  addSessionEvent: (event: string) => void
  updateMemory: (patch: Partial<Pick<GameState, 'currentLocation' | 'quests' | 'npcs' | 'sessionEvents'>>) => void
  startCombat: (enemies: Combatant[]) => void
  resolveCombatTurn: (entry: CombatEntry) => void
  endCombat: () => void
  resetSession: () => void
}

export function useGameState(): UseGameState
```

### useClaude
```ts
interface UseClaudeReturn {
  sendMessage: (userInput: string) => Promise<string>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export function useClaude(): UseClaudeReturn
```

`sendMessage` internally:
1. Reads `GameState` from store
2. Calls `buildMemoryJSON(state)` → injects into user message
3. Calls `buildSystemPrompt(theme, kidsMode)`
4. Calls `client.messages.create(...)` with full message history
5. Parses `[ACTIONS: ...]` and `[MEMORY_UPDATE: {...}]` from response
6. Calls `updateMemory(patch)` if patch found
7. Calls `appendMessage('assistant', cleanedResponse)` (tags stripped)
8. Calls `addUsage(usage.input_tokens, usage.output_tokens)`
9. Returns cleaned narrative text

### useCombat
```ts
interface UseCombatReturn {
  initiateCombat: (enemies: Omit<Combatant, 'initiative' | 'isDefeated'>[]) => void
  executeTurn: (actorId: string, action: string, targetId: string) => CombatEntry
  executeEnemyTurn: (actorId: string) => Promise<CombatEntry>   // calls Claude
  endCombatIfOver: () => boolean                                  // returns true if combat ended
  currentCombatant: Combatant | null
  isPlayerTurn: boolean
}

export function useCombat(): UseCombatReturn
```

### useTokenTracker
```ts
interface UseTokenTrackerReturn {
  sessionInputTokens: number
  sessionOutputTokens: number
  sessionTotalTokens: number
  sessionCostUsd: number
  allTimeInputTokens: number
  allTimeOutputTokens: number
  allTimeCostUsd: number
  addUsage: (inputTokens: number, outputTokens: number) => void
  resetSession: () => void
}

export function useTokenTracker(): UseTokenTrackerReturn
```

### useVoiceInput
```ts
interface UseVoiceInputReturn {
  isSupported: boolean
  isListening: boolean
  transcript: string            // live interim transcript
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
}

export function useVoiceInput(): UseVoiceInputReturn
```

### useImageGen
```ts
interface UseImageGenReturn {
  generatePortrait: (character: Character, theme: Theme) => string    // returns URL
  generateScene: (location: string, narration: string, theme: Theme) => string
  isGenerating: boolean         // true while <img> is loading
  currentImageUrl: string | null
  error: string | null
}

export function useImageGen(): UseImageGenReturn
```

---

## 7. AI Response Parser Contract

File: `src/utils/parseAIResponse.ts` (utility, not a hook)

```ts
interface ParsedAIResponse {
  narrative: string             // display text with all tags stripped
  actions: string[]             // array of 3 action strings, or [] if tag absent
  memoryPatch: Partial<Pick<GameState, 'currentLocation' | 'quests' | 'npcs' | 'sessionEvents'>> | null
  combatEntry: Omit<CombatEntry, 'id' | 'timestamp'> | null   // from [COMBAT: {...}]
  combatStart: boolean          // true if [COMBAT_START] present
}

export function parseAIResponse(raw: string): ParsedAIResponse
```

Parsing rules:
- `[ACTIONS: a | b | c]` → split on `|`, trim each, take first 3
- `[MEMORY_UPDATE: {...}]` → `JSON.parse` the inner object; catch and ignore parse errors
- `[COMBAT: {...}]` → `JSON.parse` inner object; validate required fields present
- `[COMBAT_START]` → set `combatStart: true`
- All tag occurrences stripped from `narrative`
- If any parse fails, log warning and return null for that field — never throw
