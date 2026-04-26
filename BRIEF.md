# 🎲 QuestForge — AI-Powered Solo & Family DnD App
### Product Brief v1.0 | April 2026

---

## TL;DR

A web-based AI dungeon master app built on the Claude API. Pick a theme, build a character, and play — the AI narrates the world, runs combat, and remembers everything. Designed for solo adults and families with kids. Token usage is visible at all times.

---

## What Competitors Get Right (Steal This)

| Feature | Source |
|---|---|
| D&D 5e SRD rules + character sheets | AI Realm, Friends & Fables |
| Visual combat log (HP bars, turn order, dice rolls) | Friends & Fables (see screenshot) |
| AI-generated character portraits | AI Realm |
| Persistent campaign memory | Friends & Fables |
| Text-to-speech narration | Friends & Fables |
| Free-text input (type anything) | AI Dungeon |
| Preset world themes | AI Realm, MacerAI |

---

## What Competitors Get Wrong (Fix This)

| Problem | Source | Our Fix |
|---|---|---|
| AI forgets NPCs, quests after scene transitions | Friends & Fables, AI Dungeon | Structured memory object passed every turn: active quests, NPC relationships, world state |
| AI is passive — waits for player, never drives story | AI Game Master reviews | System prompt instructs AI to proactively introduce events, NPC decisions, world changes |
| Combat is boring — monster attacks once, then dies | AI Game Master reviews | Structured turn-based combat engine with action choices, enemy tactics, AoE spells |
| Expensive paywalls hit fast (25 turns/day free) | All apps | You own the Claude API key — no artificial limits, pay per actual usage |
| No kids mode — content can get dark/mature | AI Dungeon, most apps | Kids Friendly Mode toggle: sanitizes violence, themes, language |
| Repetitive generic fantasy prose | All apps | Compact, punchy AI responses. System prompt enforces brevity + variety |
| No token/cost visibility | All apps | Live token counter + session cost in settings panel |
| Image quality is weak or requires extra credits | Friends & Fables | Use Claude's vision + prompt to Pollinations.ai (free) or DALL-E 3 via API |

---

## Core Features (MVP)

### 1. Game Setup
- **Theme picker:** Fantasy, Sci-Fi, Horror, Pirate, Lego Universe (custom)
- **Player count:** Solo or 2-4 players (shared screen co-op)
- **Kids Mode toggle:** On/Off — affects content, language, combat lethality
- **Character creation:** Name, class (Fighter/Mage/Rogue/Ranger), backstory (manual or AI-generated)
- **AI-generated character portrait** on creation (via image API)

### 2. The Adventure Screen
- **Story panel** — AI narration, scrollable, with timestamps
- **Input bar** — free text + voice input (Web Speech API)
- **3 quick-action suggestion buttons** — AI generates contextual options (e.g., "Attack", "Sneak past", "Talk to guard")
- **Character panel** — HP, stats, inventory, active quests (sidebar)
- **Map** — simple procedural ASCII/SVG dungeon map that updates as you explore

### 3. Combat System (like the screenshot)
- Triggered when combat starts
- Turn-based log entries:
  - `[Character] attacks [Enemy] — rolls 1d20+4 = 17 vs AC 14 — HIT`
  - `[Enemy] takes 8 damage — 14/22 HP remaining`
  - `[Enemy] casts Fireball — DC 13 DEX save — [Character] rolls 9 — FAIL — 18 damage`
- Color-coded: hits = green, misses = grey, crits = gold, deaths = red
- HP bars per combatant
- Turn order tracker

### 4. AI Memory System
Every Claude request includes a compact JSON state object:
```json
{
  "world": "dark_fantasy",
  "location": "Goblin Warren, Level 2",
  "quests": [{"name": "Find the Amulet", "status": "active"}],
  "npcs": [{"name": "Gruff", "relation": "ally", "last_seen": "tavern"}],
  "player": {"hp": 22, "maxHp": 30, "level": 3, "inventory": ["sword", "potion"]},
  "session_events": ["Defeated goblin patrol", "Found secret door"]
}
```
State is updated after every AI turn. Passed back in on next turn. No forgetting.

### 5. Token & Cost Dashboard (Settings Panel)
- **Tokens used this session** (input + output)
- **Estimated session cost** in USD
- **Total tokens used all-time**
- **Response length setting** — Compact / Normal / Verbose (controls max_tokens per response)
- Claude API key input (user provides their own)

### 6. Voice Input
- Web Speech API (free, browser-native)
- Push-to-talk button in input bar
- Transcript appears in text field before sending (user can edit)

### 7. Image Generation
- Character portrait on creation
- Scene illustration on demand ("Illustrate this scene" button)
- Uses Pollinations.ai API (free, no key needed) or optional DALL-E 3 key

---

## Token Efficiency Strategy

AI responses must be short by design:
- System prompt instructs: max 3 sentences per narration beat
- Combat log is structured data, not prose
- Memory state is compressed JSON, not paragraph summaries
- Response length slider lets user trade detail for tokens
- Target: ~400-600 tokens per exchange in normal mode

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Tailwind | Fast to build, good component model |
| AI | Claude Sonnet via Anthropic API | You already have access, cost-efficient |
| Voice | Web Speech API | Free, browser-native |
| Images | Pollinations.ai (free) | No key, no cost, decent quality |
| State | localStorage + JSON | No backend needed for MVP |
| Hosting | Vercel / Netlify | Free tier, instant deploy |

---

## Kids Mode Spec

When enabled:
- Combat: enemies "flee" or "surrender" instead of dying
- No blood, gore, or horror descriptions
- Violence described as cartoon/slapstick
- No dark magic or disturbing NPCs
- Story themes: adventure, friendship, puzzle-solving
- Language: G-rated
- Loot: coins and food instead of body parts

---

## Themes (Launch)

| Theme | Setting | Vibe |
|---|---|---|
| Dark Fantasy | Medieval dungeons | Classic DnD |
| Lego Universe | Brick-built worlds | Kids-friendly, playful |
| Space Odyssey | Sci-fi starships | Sci-fi RPG |
| Pirate Seas | Ocean & islands | Swashbuckling adventure |
| Horror Manor | Gothic mansion | Suspense, mystery |

---

## What to Build First (Phase 1 MVP)

1. Setup screen (theme + character creation)
2. Adventure screen with text input + AI narration
3. Basic combat log UI
4. Memory state JSON system
5. Token counter in settings
6. Kids Mode toggle

**Phase 2:** Voice input, map, portraits, scene illustrations
**Phase 3:** Multi-player, save/load campaigns, custom themes

---

## What This Is Not

- Not a full D&D 5e rules simulator
- Not multiplayer-first (co-op is bonus)
- Not a subscription product — user pays their own Claude API costs
- Not trying to beat Friends & Fables on features — beats it on: **no paywalls, token transparency, family mode, and compact smart responses**

---

*Brief prepared for personal build project. Stack is vibe-coding friendly.*
