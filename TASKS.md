# QuestForge — Build Tasks

Sequence: types → state/store → utils → API layer → hooks → UI components → screens → integration → QA

---

## TASK-01: Project scaffold
- owner: frontend
- files: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- depends: none
- acceptance:
  - `npm run dev` starts Vite dev server with no errors
  - TypeScript strict mode enabled in tsconfig
  - Tailwind base styles apply to root

---

## TASK-02: TypeScript types
- owner: api-layer
- files: `src/types/index.ts`
- depends: TASK-01
- acceptance:
  - All types from INTERFACES.md are exported: `GameState`, `Character`, `CharacterClass`, `Theme`, `Quest`, `NPC`, `CombatState`, `CombatEntry`, `SessionStats`, `ApiSettings`, `KidsMode`, `MessageEntry`, `Combatant`, `CombatantRef`, `MapCell`
  - No `any`; strict null checks pass
  - Types import cleanly in an empty consumer file

---

## TASK-03: localStorage helpers
- owner: api-layer
- files: `src/utils/storage.ts`
- depends: TASK-02
- acceptance:
  - `getItem<T>`, `setItem<T>`, `removeItem` are exported with typed generics
  - Handles JSON parse errors gracefully (returns null, logs warning)
  - `sessionStorageGet/Set` variants exist for API key

---

## TASK-04: Zustand game store
- owner: api-layer
- files: `src/store/gameStore.ts`, `src/store/middleware/localStorageSync.ts`
- depends: TASK-02, TASK-03
- acceptance:
  - Store initialises with empty/default `GameState`
  - All actions from ARCHITECTURE.md are implemented and typed
  - State persists to `qf:campaign:{campaignId}` via persist middleware
  - `resetSession()` clears campaign state and removes localStorage key

---

## TASK-05: Zustand settings store
- owner: api-layer
- files: `src/store/settingsStore.ts`
- depends: TASK-02, TASK-03
- acceptance:
  - Stores `ApiSettings` and `kidsMode`
  - `apiKey` is stored in sessionStorage only — not in the Zustand persist payload
  - Persists remaining settings to `qf:settings`
  - `setResponseLength`, `setKidsMode`, `setApiKey` actions exported

---

## TASK-06: Dice utilities
- owner: api-layer
- files: `src/utils/dice.ts`
- depends: TASK-01
- acceptance:
  - `roll(sides: number): number` — cryptographically random via `crypto.getRandomValues`
  - `rollWithModifier(sides, modifier)` returns `{ roll, modifier, total }`
  - `isCrit(roll)`, `isMiss(roll)` — d20 specific (20 = crit, 1 = miss)
  - Unit-testable (pure functions, no side effects)

---

## TASK-07: Token and cost utilities
- owner: api-layer
- files: `src/utils/tokenEstimate.ts`, `src/utils/costEstimate.ts`
- depends: TASK-01
- acceptance:
  - `estimateTokens(text: string): number` — chars / 4, integer result
  - `calcCost(inputTokens, outputTokens): number` — uses Sonnet input/output USD rates (hard-coded, comment shows rates)
  - `formatCost(usd: number): string` — e.g. "$0.0034"

---

## TASK-08: Memory JSON builder
- owner: api-layer
- files: `src/utils/buildMemoryJSON.ts`
- depends: TASK-02, TASK-04
- acceptance:
  - `buildMemoryJSON(state: GameState): string` — returns compact JSON string
  - Empty arrays are omitted from output
  - Output is ≤ 250 tokens (verified by `estimateTokens`)
  - `recentEvents` capped at last 10 entries

---

## TASK-09: System prompt builder
- owner: api-layer
- files: `src/utils/buildSystemPrompt.ts`
- depends: TASK-02
- acceptance:
  - `buildSystemPrompt(theme: Theme, kidsMode: boolean): string`
  - Standard prompt is < 300 tokens
  - Kids variant replaces violence/death rules with cartoon/surrender rules
  - Prompt instructs: max 3 sentences per narration beat, no recap, proactive NPC/event introductions
  - Both variants include the 5 theme-specific flavour lines

---

## TASK-10: useTokenTracker hook
- owner: api-layer
- files: `src/hooks/useTokenTracker.ts`
- depends: TASK-05, TASK-07
- acceptance:
  - Reads session totals from settings store
  - `addUsage(inputTokens, outputTokens)` updates session stats and writes all-time totals to `qf:stats:alltime`
  - `resetSession()` zeroes session counts without clearing all-time
  - Exports `{ sessionTokens, sessionCost, allTimeTokens, allTimeCost }`

---

## TASK-11: useClaude hook
- owner: api-layer
- files: `src/hooks/useClaude.ts`
- depends: TASK-04, TASK-05, TASK-08, TASK-09, TASK-10
- acceptance:
  - `sendMessage(userInput: string): Promise<string>` — builds full API request and returns assistant text
  - Prepends `<memory>...</memory>` block to every user message
  - Uses system prompt from `buildSystemPrompt`
  - Calls `addUsage` after each response with actual token counts from `usage` field
  - Exposes `isLoading: boolean` and `error: string | null`
  - API key missing → throws descriptive error, does not call API

---

## TASK-12: useGameState hook
- owner: api-layer
- files: `src/hooks/useGameState.ts`
- depends: TASK-04
- acceptance:
  - Re-exports all store actions with stable references
  - Provides `activePlayer: Character` (first player in list for solo mode)
  - Provides `isInCombat: boolean` derived from `combatState.active`
  - No business logic — pure store accessor

---

## TASK-13: useCombat hook
- owner: api-layer
- files: `src/hooks/useCombat.ts`
- depends: TASK-04, TASK-06
- acceptance:
  - `initiateCombat(enemies: Combatant[])` — rolls initiative for all combatants, sets turn order
  - `executeTurn(action: string, targetId: string)` — rolls attack, calculates damage, creates `CombatEntry`, calls `resolveCombatTurn` on store
  - Kids mode remaps `result: 'death'` → `result: 'defeated'`
  - `endCombatIfOver()` — checks if all enemies defeated/fled; calls `endCombat()` if true

---

## TASK-14: useVoiceInput hook
- owner: api-layer
- files: `src/hooks/useVoiceInput.ts`
- depends: TASK-01
- acceptance:
  - `startListening()`, `stopListening()`, `isListening: boolean`, `transcript: string`
  - Detects browser support; `isSupported: boolean` flag
  - Transcript is interim (live update) until `stopListening()` finalises it
  - Cleans up SpeechRecognition instance on unmount

---

## TASK-15: useImageGen hook
- owner: api-layer
- files: `src/hooks/useImageGen.ts`
- depends: TASK-01
- acceptance:
  - `generatePortrait(character: Character, theme: Theme): string` — returns Pollinations URL
  - `generateScene(location: string, narration: string, theme: Theme): string` — returns Pollinations URL
  - `isGenerating: boolean` state (tracks image load via `<img onLoad>`)
  - Returns placeholder SVG data URI on error

---

## TASK-16: Base UI components
- owner: frontend
- files: `src/components/ui/Button.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/Toggle.tsx`
- depends: TASK-01
- acceptance:
  - Button: variants (`primary`, `secondary`, `ghost`, `danger`), `disabled` state, keyboard focusable
  - Badge: `color` prop (green/red/grey/gold) for combat result colouring
  - Modal: traps focus, ESC closes, backdrop click closes, ARIA `role="dialog"`
  - Toggle: ARIA `role="switch"`, `aria-checked`, label association

---

## TASK-17: HPBar component
- owner: frontend
- files: `src/components/ui/HPBar.tsx`
- depends: TASK-16
- acceptance:
  - Renders coloured bar: green > 50%, yellow 25–50%, red < 25%
  - Animates width transition (CSS transition 300ms)
  - Accepts `current`, `max`, optional `label` props
  - ARIA: `role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

---

## TASK-18: TokenMeter component
- owner: frontend
- files: `src/components/ui/TokenMeter.tsx`
- depends: TASK-16, TASK-10
- acceptance:
  - Shows session tokens + cost in compact inline display
  - Updates reactively from `useTokenTracker`
  - Tooltip on hover shows breakdown (input / output tokens)
  - Does not re-render on unrelated state changes (memo)

---

## TASK-19: ThemePicker component
- owner: frontend
- files: `src/components/setup/ThemePicker.tsx`
- depends: TASK-16, TASK-02
- acceptance:
  - Renders 5 theme cards (Dark Fantasy, Lego Universe, Space Odyssey, Pirate Seas, Horror Manor)
  - Selected theme has visible active state (ring + background)
  - Each card shows theme name, one-line vibe description, and a representative emoji/icon
  - Keyboard navigable (arrow keys between cards)

---

## TASK-20: KidsModeToggle component
- owner: frontend
- files: `src/components/setup/KidsModeToggle.tsx`
- depends: TASK-16, TASK-05
- acceptance:
  - Uses `Toggle` base component
  - When disabling mid-session: shows confirmation Modal ("Are you sure? Content may become adult-themed.")
  - Lock icon visible when enabled
  - Reads/writes `settingsStore.kidsMode`

---

## TASK-21: CharacterForm component
- owner: frontend
- files: `src/components/setup/CharacterForm.tsx`
- depends: TASK-16, TASK-02, TASK-11
- acceptance:
  - Fields: Name (text), Class (Fighter/Mage/Rogue/Ranger — 4 card buttons), Backstory (textarea)
  - "Generate backstory" button calls Claude with a 1-shot prompt; populates textarea
  - Validation: name required, class required before proceeding
  - Accessible labels on all inputs; error messages use `role="alert"`

---

## TASK-22: CharacterPortrait component
- owner: frontend
- files: `src/components/setup/CharacterPortrait.tsx`
- depends: TASK-15, TASK-16
- acceptance:
  - Shows spinner while `isGenerating` is true
  - Displays generated portrait at 256×256
  - "Regenerate" button triggers new URL with different seed
  - Falls back to placeholder on image error

---

## TASK-23: StoryPanel component
- owner: frontend
- files: `src/components/adventure/StoryPanel.tsx`
- depends: TASK-16, TASK-12
- acceptance:
  - Renders `messages[]` from game store as scrollable list
  - Auto-scrolls to bottom on new message
  - Distinguishes narrator (assistant) vs player (user) messages visually
  - "Illustrate this scene" button appears after each assistant message; calls `useImageGen`
  - Timestamps shown in relative format ("2 min ago")

---

## TASK-24: InputBar component
- owner: frontend
- files: `src/components/adventure/InputBar.tsx`
- depends: TASK-16, TASK-14
- acceptance:
  - Textarea expands vertically (max 4 lines) as user types
  - Send on Enter (Shift+Enter = newline)
  - Voice button toggles `startListening/stopListening`; pulsing red ring when active
  - Disabled + loading spinner when `useClaude.isLoading`
  - Clears after send

---

## TASK-25: QuickActions component
- owner: frontend
- files: `src/components/adventure/QuickActions.tsx`
- depends: TASK-16, TASK-11, TASK-12
- acceptance:
  - Renders 3 suggestion buttons from last assistant message (parsed from a `[ACTIONS: ...]` tag in AI response)
  - Clicking a suggestion populates InputBar and auto-sends
  - Hides during combat (combat has its own action UI)
  - Skeleton buttons shown while `isLoading`

---

## TASK-26: CharacterSidebar component
- owner: frontend
- files: `src/components/adventure/CharacterSidebar.tsx`
- depends: TASK-17, TASK-12
- acceptance:
  - Panels: HP (HPBar), Stats (str/dex/con/int/wis/cha), Inventory (list), Active Quests (list)
  - Collapsible on mobile (slide-out drawer)
  - Quest status badge: active (yellow), completed (green), failed (red)
  - Inventory items listed with remove button (stretch goal: drag-to-use)

---

## TASK-27: DungeonMap component
- owner: frontend
- files: `src/components/adventure/DungeonMap.tsx`
- depends: TASK-16, TASK-12
- acceptance:
  - Renders `MapCell[][]` as SVG grid (each cell = 20×20px)
  - Cell types: `unexplored` (dark), `room` (lit), `corridor`, `current` (pulsing dot), `poi` (star icon)
  - Pan via mouse drag; fits in a fixed 240×240 container with overflow hidden
  - Collapses to icon button on mobile

---

## TASK-28: CombatLog component
- owner: frontend
- files: `src/components/combat/CombatLog.tsx`
- depends: TASK-16, TASK-02
- acceptance:
  - Renders `CombatEntry[]` as styled rows
  - Color coding: `hit` = green text, `miss` = grey, `crit` = gold + bold, `death`/`defeated` = red
  - Each entry shows: actor → target, action, roll details, result, HP remaining
  - Auto-scrolls to latest entry
  - Scrollable container with max-height

---

## TASK-29: CombatantCard component
- owner: frontend
- files: `src/components/combat/CombatantCard.tsx`
- depends: TASK-17, TASK-02
- acceptance:
  - Shows combatant name, type (player/enemy), HP bar, AC
  - Glows/highlighted when it is their turn
  - `defeated` state: greyed out, strikethrough name
  - Kids mode: uses "knocked out" label instead of HP = 0

---

## TASK-30: TurnOrder component
- owner: frontend
- files: `src/components/combat/TurnOrder.tsx`
- depends: TASK-16, TASK-12
- acceptance:
  - Horizontal scroll list of combatant tokens in initiative order
  - Active turn token is enlarged and highlighted
  - Initiative value shown below each token
  - Updates reactively when `combatState.currentTurnIndex` changes

---

## TASK-31: Settings panel components
- owner: frontend
- files: `src/components/settings/SettingsPanel.tsx`, `src/components/settings/ApiKeyInput.tsx`, `src/components/settings/TokenDashboard.tsx`, `src/components/settings/ResponseLengthSlider.tsx`
- depends: TASK-16, TASK-18, TASK-20
- acceptance:
  - `ApiKeyInput`: password field, show/hide toggle, "Save key" stores to sessionStorage
  - `TokenDashboard`: session tokens, session cost, all-time tokens, all-time cost — all from `useTokenTracker`
  - `ResponseLengthSlider`: 3-step segmented control (Compact / Normal / Verbose); updates `settingsStore`
  - `SettingsPanel`: slide-in drawer from right, closes on ESC, overlay backdrop

---

## TASK-32: SetupScreen
- owner: frontend
- files: `src/screens/SetupScreen.tsx`
- depends: TASK-19, TASK-20, TASK-21, TASK-22, TASK-04
- acceptance:
  - Multi-step flow: Step 1 (Theme + KidsMode) → Step 2 (Character creation + Portrait) → Step 3 (Confirm + Start)
  - Step indicator shows current position
  - "Back" navigates to previous step without losing state
  - On "Start Adventure": calls `startCampaign`, navigates to `/adventure`
  - Player count selector (1–4) shown at Step 2; adds CharacterForm per player

---

## TASK-33: AdventureScreen
- owner: frontend
- files: `src/screens/AdventureScreen.tsx`
- depends: TASK-23, TASK-24, TASK-25, TASK-26, TASK-27, TASK-28, TASK-29, TASK-30, TASK-11, TASK-13
- acceptance:
  - Layout: StoryPanel (main, center), CharacterSidebar (right, collapsible), InputBar (bottom)
  - When `isInCombat`: CombatLog replaces StoryPanel lower half; TurnOrder and CombatantCards appear
  - `QuickActions` strip sits between StoryPanel and InputBar
  - Settings gear icon → opens `SettingsPanel` overlay
  - Redirects to `/` if no active campaign in store

---

## TASK-34: Routing and app shell
- owner: frontend
- files: `src/App.tsx`, `src/main.tsx`
- depends: TASK-32, TASK-33
- acceptance:
  - Routes: `/` → `SetupScreen`, `/adventure` → `AdventureScreen`
  - `/adventure` redirects to `/` if `gameStore.campaignId` is null
  - `TokenMeter` persistent in app shell (bottom right corner)
  - Global error boundary catches unhandled errors and shows recovery UI

---

## TASK-35: Claude API integration — game turn flow
- owner: api-layer
- files: `src/hooks/useClaude.ts` (update), `src/utils/buildMemoryJSON.ts` (update)
- depends: TASK-11, TASK-33
- acceptance:
  - Full round-trip: user input → memory injected → Claude response → `appendMessage` called → `updateMemory` called with any JSON patch Claude returns
  - AI response parser extracts: `[ACTIONS: ...]` block for QuickActions, `[MEMORY_UPDATE: {...}]` JSON patch for store
  - Streaming not required for MVP; single `messages.create` call
  - Error states surfaced in UI (not just console)

---

## TASK-36: Combat AI integration
- owner: api-layer
- files: `src/hooks/useCombat.ts` (update), `src/utils/buildSystemPrompt.ts` (update)
- depends: TASK-13, TASK-35
- acceptance:
  - Combat turns for enemies are resolved by Claude returning a structured JSON block: `[COMBAT: { actor, action, roll, target, result, damage }]`
  - `useCombat.executeEnemyTurn()` calls Claude with a "combat only" system prompt variant and parses the JSON block
  - Player turns use local dice + `useCombat.executeTurn()` (no Claude call needed)
  - Combat ends when all enemies have `result: 'death'` or `'defeated'` or `'fled'`

---

## TASK-37: Kids mode end-to-end
- owner: qa
- files: `src/utils/buildSystemPrompt.ts`, `src/hooks/useCombat.ts`, `src/components/setup/KidsModeToggle.tsx`
- depends: TASK-09, TASK-13, TASK-20, TASK-35
- acceptance:
  - Toggle kids mode ON → system prompt switches to kids variant; confirmed by logging prompt in dev mode
  - Combat in kids mode: no `result: 'death'` entries in CombatLog; all show `'defeated'`
  - Horror Manor theme description is softened when kids mode is on (mystery/puzzle framing)
  - Cannot disable kids mode without confirmation modal

---

## TASK-38: Token dashboard end-to-end
- owner: qa
- files: `src/hooks/useTokenTracker.ts`, `src/components/settings/TokenDashboard.tsx`
- depends: TASK-10, TASK-31, TASK-35
- acceptance:
  - After each Claude response, session token counts update in the dashboard
  - All-time totals persist after page reload
  - Session cost in USD matches expected Sonnet pricing for token counts
  - `resetSession` zeroes session counts; all-time is unaffected

---

## TASK-39: Voice input integration
- owner: frontend
- files: `src/components/adventure/InputBar.tsx` (update), `src/hooks/useVoiceInput.ts`
- depends: TASK-14, TASK-24
- acceptance:
  - Push-to-talk button functional in Chrome/Edge (primary targets for Web Speech API)
  - Interim transcript visible in InputBar while listening
  - On `stopListening()`, finalised transcript populates InputBar; user can edit before sending
  - Graceful degradation: button hidden when `!isSupported`

---

## TASK-40: Polish + accessibility audit
- owner: qa
- files: all component files (read-only audit, targeted fixes)
- depends: TASK-33, TASK-34, TASK-39
- acceptance:
  - All interactive elements keyboard-accessible (Tab, Enter, Space, ESC)
  - Contrast ratio ≥ 4.5:1 on all text/background pairs (verify with browser dev tools)
  - No console errors or warnings in production build
  - `npm run build` completes with no TypeScript errors
  - Lighthouse accessibility score ≥ 90 on SetupScreen and AdventureScreen
