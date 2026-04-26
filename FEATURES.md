# QuestForge — Features & Scenarios

## Core Concept
Browser-based solo/family AI RPG. No server, no accounts required. Claude (Anthropic) as DM. D&D 5e mechanics. Five themes. Deployable on GitHub Pages.

---

## Themes
- Dark Fantasy (grim medieval)
- Space Odyssey (sci-fi)
- Pirate Seas (age of sail)
- Horror Manor (gothic Victorian)
- Lego Universe (kids/colorful)

---

## Character Creation
- Point-buy stat system (27 points, STR/DEX/CON/INT/WIS/CHA, range 8–15)
- Four classes: Fighter, Mage, Rogue, Ranger
- Backstory field
- AI-generated character portrait (Pollinations.ai, deterministic per name+theme)
- HP, AC, level derived from class + stats

---

## AI Dungeon Master
- Claude claude-sonnet-4-5 via Anthropic SDK (browser-direct, no proxy)
- System prompt with full D&D 5e rules embedded
- Kids Mode: G-rated tone, no death, slapstick violence, DC 8–12 only
- Response length: Compact (400 tok) / Normal (900 tok) / Verbose (1600 tok)
- Memory JSON injected every turn (location, quests, NPCs, inventory, HP, recent events)
- Scene XML injected every turn (visible objects on map with proximity/direction)
- Auto-sends opening scene on new campaign start
- Quick action buttons (3 options) from AI response
- Voice input (microphone) on mobile

---

## D&D 5e Mechanics
- Skill checks: 18 skills mapped (Persuasion, Deception, Stealth, Perception, etc.)
- Saving throws: all 6 types (DEX, CON, WIS, INT, STR, CHA)
- Stat modifiers applied to all rolls
- DC system (trivial 8 → legendary 25)
- Auto-roll triggered after AI outputs [SKILL_CHECK] or [SAVING_THROW] tag
- Result fed back to AI automatically
- Combat: initiative, turn order, attack rolls, damage, HP tracking
- Cover system: half cover (+2 AC) when adjacent to obstacle
- Dodge action: enemies roll with disadvantage
- Area-of-effect spell logic (Fireball 3sq radius, Lightning Bolt line)
- Weapon/spell range enforcement (melee 1sq, longbow 12sq, cantrip 6sq, etc.)

---

## Combat System
- 8×8 tactical grid (Chebyshev distance, 1 square = 5 ft)
- Player and enemies placed on grid at combat start
- Click enemy to attack (no mode switch needed)
- Valid moves highlighted (blue cells)
- Valid targets highlighted (pulse ring on enemies in range)
- Enemy AI: moves toward player, attacks when adjacent, respects cover
- Dodge action button
- End Turn button
- Combat log (last 5 actions)
- Dice rolls shown in log
- AI narrates each exchange (sendNarration, non-blocking, 120 tok)
- Grid context (positions, HP, cover, obstacles) sent to AI every combat message
- Obstacles randomly generated (4–6 per map, rocks/barrels/crates)
- Half-cover detection: player orthogonally adjacent to obstacle

---

## Scene Map (Always Visible)
- 8×8 grid sidebar, always shown (exploration + combat)
- Background: AI-generated tactical battlemap (Pollinations, per location+theme)
- Map cached per location — same image reused in combat and exploration
- Player token: character portrait or initial + HP bar
- NPC tokens: AI-generated portraits (Pollinations, deterministic seed per name+theme), fallback to icon emoji
- Object tokens: emoji icon in rounded card, purple border
- Exit tokens: blue border, door icon
- Interacted objects: greyscale/faded
- Hover tooltips: show object/NPC name
- Distant objects: shown in legend below grid (outside vision)
- Scene objects from AI MEMORY_UPDATE: id, name, icon, type, proximity, direction
- Proximity: adjacent(1sq) / near(2sq) / medium(4sq) / far(6sq) / distant(legend)
- Direction: N/NE/E/SE/S/SW/W/NW/center
- Resizable panel: drag handle between chat and map (200–560px)

---

## Persistence
- Zustand store with localStorage persist (auto, no user action)
- Resume card on setup screen (reads from localStorage)
- Supabase cloud save: auto-save 3s after each turn
- Resume from Supabase: campaign list on setup screen
- Delete campaigns (local + Supabase)
- Campaign deduplication: local card hidden if Supabase already lists it
- Campaign ID: UUID, generated per campaign

---

## Session Stats
- Per-session: input tokens, output tokens, total, estimated cost USD
- All-time: cumulative across all sessions (localStorage)
- Displayed in setup screen badge and settings panel

---

## Settings
- Anthropic API key (sessionStorage only, cleared on tab close)
- Response length selector
- Kids mode toggle (in-session)
- Supabase URL + anon key (localStorage, persisted)
- Clear session data
- End campaign + return to setup
- Token usage breakdown (session + all-time)

---

## Deployment
- Vite + React + TypeScript + Tailwind v4
- GitHub Pages via GitHub Actions (auto-deploy on push to main)
- No backend required
- Supabase optional (for cloud save/resume)

---

## Scenarios Supported
1. Pure exploration: talk to NPCs, investigate objects, move between locations
2. Social encounters: Persuasion, Deception, Intimidation checks with dice
3. Stealth runs: Stealth checks, consequence-based narration
4. Combat encounters: full tactical grid, multi-enemy, cover, dodge
5. Puzzle/investigation: Investigation, Arcana, History checks
6. Quest tracking: active/completed/failed quests shown in character panel
7. NPC relationship tracking: ally/neutral/hostile, last seen location
8. Multi-location adventure: map regenerates per location
9. Kids mode: same engine, sanitized tone, no death, lower DCs
10. Campaign resume: pick up exactly where left off (local or cloud)
