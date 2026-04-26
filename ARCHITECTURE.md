# QuestForge — Architecture

## Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Build tool | Vite + React 18 | Fast HMR, native ESM, zero config for TS |
| UI | Tailwind CSS v3 | Utility-first, no runtime CSS, pairs well with component model |
| State | Zustand | Lighter than Redux, cleaner than Context for cross-component game state, easy localStorage middleware |
| AI | Anthropic SDK (browser) | `@anthropic-ai/sdk` supports browser fetch; user supplies key, no proxy needed |
| Voice | Web Speech API | Browser-native, no cost, no dependency |
| Images | Pollinations.ai | Free, no key, URL-based (no SDK required) |
| Persistence | localStorage + JSON | No backend for MVP; structured per-campaign keys |
| Routing | React Router v6 | Declarative, lightweight, handles Setup → Adventure flow |
| Types | TypeScript strict | All shared contracts typed; enforced at build time |

---

## Folder Structure

```
/Users/adela/projects/QuestForge/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── BRIEF.md
├── ARCHITECTURE.md
├── TASKS.md
├── INTERFACES.md
└── src/
    ├── main.tsx                    — App entry, router bootstrap
    ├── App.tsx                     — Route tree
    │
    ├── types/
    │   └── index.ts                — All shared TS types (GameState, Character, Quest, etc.)
    │
    ├── store/
    │   ├── gameStore.ts            — Zustand store: GameState + actions
    │   ├── settingsStore.ts        — Zustand store: ApiSettings, KidsMode, ResponseLength
    │   └── middleware/
    │       └── localStorageSync.ts — Zustand persist middleware config
    │
    ├── hooks/
    │   ├── useGameState.ts         — Reads/writes game store; exposes typed actions
    │   ├── useClaude.ts            — Claude API call wrapper; injects memory, builds messages
    │   ├── useCombat.ts            — Turn-based combat state machine
    │   ├── useTokenTracker.ts      — Accumulates input/output tokens per session + all-time
    │   ├── useVoiceInput.ts        — Web Speech API push-to-talk abstraction
    │   └── useImageGen.ts          — Pollinations.ai URL builder + loading state
    │
    ├── utils/
    │   ├── buildSystemPrompt.ts    — Assembles DM system prompt (standard + kids variant)
    │   ├── buildMemoryJSON.ts      — Serialises GameState → compact memory object
    │   ├── dice.ts                 — d20, dN rollers; hit/miss/crit logic
    │   ├── tokenEstimate.ts        — Client-side token count approximation (chars / 4)
    │   ├── costEstimate.ts         — Maps token count → USD for Sonnet pricing
    │   └── storage.ts              — Typed localStorage get/set/remove helpers
    │
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Badge.tsx
    │   │   ├── HPBar.tsx
    │   │   ├── TokenMeter.tsx
    │   │   ├── Modal.tsx
    │   │   └── Toggle.tsx
    │   ├── setup/
    │   │   ├── ThemePicker.tsx
    │   │   ├── CharacterForm.tsx
    │   │   ├── CharacterPortrait.tsx
    │   │   └── KidsModeToggle.tsx
    │   ├── adventure/
    │   │   ├── StoryPanel.tsx       — Scrollable narration log
    │   │   ├── InputBar.tsx         — Text input + voice button + send
    │   │   ├── QuickActions.tsx     — 3 AI-generated suggestion buttons
    │   │   ├── CharacterSidebar.tsx — HP, stats, inventory, quests
    │   │   └── DungeonMap.tsx       — ASCII/SVG procedural map
    │   ├── combat/
    │   │   ├── CombatLog.tsx        — Color-coded turn entries
    │   │   ├── CombatantCard.tsx    — HP bar + name per combatant
    │   │   └── TurnOrder.tsx        — Initiative tracker
    │   └── settings/
    │       ├── SettingsPanel.tsx    — Drawer/modal wrapper
    │       ├── ApiKeyInput.tsx
    │       ├── TokenDashboard.tsx
    │       └── ResponseLengthSlider.tsx
    │
    └── screens/
        ├── SetupScreen.tsx         — Theme + character creation flow
        ├── AdventureScreen.tsx     — Main game screen
        └── SettingsScreen.tsx      — Accessed via overlay, not a route
```

---

## Data Models

### GameState
Top-level object stored in Zustand and synced to localStorage.

```ts
{
  campaignId: string            // UUID, key for localStorage
  theme: Theme
  kidsMode: boolean
  players: Character[]          // 1–4
  currentLocation: string
  quests: Quest[]
  npcs: NPC[]
  sessionEvents: string[]       // last 10 significant events (ring buffer)
  messages: MessageEntry[]      // full conversation history for story panel
  combatState: CombatState | null
  map: MapCell[][]              // 2D grid; grows as explored
  sessionStats: SessionStats
  createdAt: number
  updatedAt: number
}
```

### Character
```ts
{
  id: string
  name: string
  class: CharacterClass          // Fighter | Mage | Rogue | Ranger
  backstory: string
  portraitUrl: string            // Pollinations.ai URL
  level: number
  hp: number
  maxHp: number
  ac: number
  stats: { str, dex, con, int, wis, cha: number }
  inventory: string[]
  activeEffects: string[]
}
```

### Quest
```ts
{ id: string; name: string; description: string; status: 'active' | 'completed' | 'failed'; giver: string }
```

### NPC
```ts
{ id: string; name: string; relation: 'ally' | 'neutral' | 'hostile'; lastSeen: string; notes: string }
```

### CombatState
```ts
{
  active: boolean
  round: number
  turnOrder: CombatantRef[]      // sorted by initiative
  currentTurnIndex: number
  combatants: Combatant[]        // players + enemies with live HP
  log: CombatEntry[]
}
```

### CombatEntry
```ts
{
  round: number
  actorId: string
  targetId: string
  action: string                 // "attacks", "casts Fireball", etc.
  roll?: number
  modifier?: number
  total?: number
  dc?: number
  result: 'hit' | 'miss' | 'crit' | 'save' | 'fail' | 'death'
  damage?: number
  hpAfter?: number
  hpMax?: number
  narrative: string
}
```

### SessionStats
```ts
{
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  allTimeInputTokens: number     // from localStorage, persisted
  allTimeOutputTokens: number
  turnCount: number
}
```

### ApiSettings
```ts
{
  apiKey: string                 // stored only in sessionStorage (not localStorage)
  model: 'claude-sonnet-4-5'
  responseLength: 'compact' | 'normal' | 'verbose'  // maps to max_tokens
  maxTokensMap: { compact: 300, normal: 600, verbose: 1200 }
}
```

---

## Claude API Integration

### Client-side approach
The Anthropic SDK is instantiated directly in the browser using the user's API key. `dangerouslyAllowBrowser: true` is required and explained to the user in the UI — their key never leaves their browser.

```ts
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
```

### Message format per turn
Every API call sends:
1. A system prompt (assembled by `buildSystemPrompt.ts`)
2. The full `messages[]` conversation history (role: user/assistant pairs)
3. The current user input appended as the new user message

The memory JSON is injected as a structured XML block at the top of each user message:

```
<memory>
{compacted JSON — see buildMemoryJSON.ts}
</memory>

[Player's actual input here]
```

### Memory JSON shape (what buildMemoryJSON.ts produces)
Kept deliberately small — target < 200 tokens:

```json
{
  "world": "dark_fantasy",
  "location": "Goblin Warren, Level 2",
  "round": 5,
  "players": [{ "name": "Arvid", "hp": 22, "maxHp": 30, "level": 3, "class": "Fighter" }],
  "quests": [{ "name": "Find the Amulet", "status": "active" }],
  "npcs": [{ "name": "Gruff", "relation": "ally", "lastSeen": "tavern" }],
  "inventory": ["iron sword", "healing potion x2"],
  "recentEvents": ["Defeated goblin patrol", "Found secret door"],
  "kidsMode": false,
  "combatActive": false
}
```

Fields omitted when empty (npcs, quests, inventory) to save tokens. `recentEvents` is a ring buffer capped at 10.

### Token counting strategy
- After each API response, use `usage.input_tokens` and `usage.output_tokens` from the response object
- Accumulate into `sessionStats` in Zustand
- All-time totals written to localStorage key `qf:stats:alltime` after every turn
- Client-side estimate via `tokenEstimate.ts` (chars / 4) shown while streaming, replaced by actual on completion

---

## Token Efficiency Strategy

| Lever | Implementation |
|---|---|
| System prompt brevity | DM prompt is < 300 tokens; no filler prose |
| Memory compression | JSON not paragraphs; empty arrays omitted |
| Response cap | `max_tokens` = 300 / 600 / 1200 depending on ResponseLength setting |
| Combat as data | AI returns structured combat JSON, app renders it — not prose descriptions |
| Session event ring buffer | `recentEvents` capped at 10 strings |
| Message history trimming | Keep last 20 message pairs in `messages[]`; older context is summarised into memory JSON on overflow |
| System prompt instructs | "3 sentences max per narration beat. No recap of previous turn." |

---

## Kids Mode Implementation

`kidsMode: boolean` lives in both `GameState` and `ApiSettings` (synced).

`buildSystemPrompt.ts` selects the kids variant when true. The kids system prompt:
- Replaces violence rules with cartoon/slapstick rules
- Instructs AI: enemies flee/surrender, no death descriptions
- Blocks horror, dark magic, disturbing NPC behaviour
- Enforces G-rated language
- Themes permitted: adventure, friendship, puzzles, Lego Universe, Pirate Seas

UI enforcement: `KidsModeToggle.tsx` shows a lock icon once enabled — requires confirmation to disable (prevents accidental toggle mid-session with children watching).

Combat engine (`useCombat.ts`): when `kidsMode = true`, `result: 'death'` is remapped to `result: 'defeated'` and narrative substitutes "knocked out" / "ran away".

---

## Image Generation (Pollinations.ai)

URL pattern:
```
https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true&seed={seed}
```

Used in two contexts:
1. **Character portrait** — generated on character creation, stored as URL in `Character.portraitUrl`
2. **Scene illustration** — generated on demand; displayed inline in `StoryPanel.tsx`

`useImageGen.ts` handles:
- Prompt construction (theme + character description → Pollinations prompt)
- URL encoding
- Loading state (`isGenerating: boolean`)
- Error fallback (placeholder SVG)

Portrait prompt template:
```
RPG character portrait, {class}, {theme} setting, {physical descriptors from backstory}, dramatic lighting, detailed, fantasy art style
```

Scene prompt template:
```
{theme} setting, {currentLocation}, {last 1 sentence of AI narration}, dramatic scene, detailed illustration
```

---

## State Management

Zustand is used with the built-in `persist` middleware for localStorage sync.

Two stores:
1. `gameStore.ts` — full `GameState`, persisted under key `qf:campaign:{campaignId}`
2. `settingsStore.ts` — `ApiSettings` + `KidsMode`, persisted under key `qf:settings`

API key exception: stored in `sessionStorage` only (not persisted across browser sessions). User must re-enter on reload. This is a deliberate security choice surfaced in the UI.

Store actions in `gameStore.ts`:
- `startCampaign(theme, players, kidsMode)`
- `appendMessage(role, content)`
- `updatePlayerHP(playerId, delta)`
- `addQuestEvent(event)`
- `updateMemory(patch)` — partial update to quests/npcs/location/sessionEvents
- `startCombat(enemies)`
- `resolveCombatTurn(entry)`
- `endCombat()`
- `resetSession()`
