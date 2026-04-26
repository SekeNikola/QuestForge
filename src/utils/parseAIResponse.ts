import type { ParsedAIResponse, GameState, CombatEntry, SkillCheck, SceneObject } from '../types/index.ts'

// Extracts the first balanced {…} block starting at or after fromIndex.
// Needed because regex \{[\s\S]*?\} stops at the first } and breaks nested JSON.
function extractJsonBlock(text: string, fromIndex: number): { json: string; end: number } | null {
  const start = text.indexOf('{', fromIndex)
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 }
    }
  }
  return null
}

// Strips a tagged block like [TAG: {...}] using balanced brace extraction.
// Returns { extracted: string | null, cleaned: string }
function stripTaggedBlock(text: string, tag: string): { extracted: string | null; cleaned: string } {
  const tagRe = new RegExp(`\\[${tag}:\\s*`, 'i')
  const match = tagRe.exec(text)
  if (!match) return { extracted: null, cleaned: text }

  const jsonStart = match.index + match[0].length
  const block = extractJsonBlock(text, jsonStart - 1) // -1 to start search from the opening {
  if (!block) {
    // JSON was truncated (hit max_tokens mid-block) — strip from tag to end to prevent leaking
    const cleaned = text.slice(0, match.index).trimEnd()
    return { extracted: null, cleaned }
  }

  // The closing ] should immediately follow the closing }
  const afterJson = text.slice(block.end).trimStart()
  const closeBracket = afterJson.startsWith(']') ? 1 : 0
  const fullEnd = block.end + (text.slice(block.end).length - afterJson.length) + closeBracket

  const cleaned = text.slice(0, match.index) + text.slice(fullEnd)
  return { extracted: block.json, cleaned }
}

export function parseAIResponse(raw: string): ParsedAIResponse {
  let text = raw

  // ─── [COMBAT_START] ───────────────────────────────────────────────────────
  const combatStart = /\[COMBAT_START\]/i.test(text)
  text = text.replace(/\[COMBAT_START\]/gi, '')

  // ─── [ACTIONS: a | b | c] ─────────────────────────────────────────────────
  let actions: string[] = []
  const actionsMatch = text.match(/\[ACTIONS:\s*([^\]]+)\]/i)
  if (actionsMatch) {
    actions = actionsMatch[1]!.split('|').map(s => s.trim()).filter(Boolean).slice(0, 3)
    text = text.replace(/\[ACTIONS:[^\]]*\]/gi, '')
  }

  // ─── [MEMORY_UPDATE: {...}] ────────────────────────────────────────────────
  let memoryPatch: ParsedAIResponse['memoryPatch'] = null
  const { extracted: memJson, cleaned: afterMem } = stripTaggedBlock(text, 'MEMORY_UPDATE')
  text = afterMem
  let xpGained = 0
  if (memJson) {
    try {
      const raw = JSON.parse(memJson) as Record<string, unknown>
      if (typeof raw.xpGained === 'number' && raw.xpGained > 0) xpGained = raw.xpGained
      memoryPatch = raw as Partial<
        Pick<GameState, 'currentLocation' | 'quests' | 'npcs' | 'sessionEvents' | 'sceneObjects'>
      >
      // Validate and normalise sceneObjects if present
      if (Array.isArray(raw.sceneObjects)) {
        const VALID_PROXIMITY = new Set(['adjacent','near','medium','far','distant'])
        const VALID_DIR = new Set(['n','ne','e','se','s','sw','w','nw','center'])
        memoryPatch.sceneObjects = (raw.sceneObjects as unknown[]).filter(
          (o): o is SceneObject =>
            typeof (o as SceneObject).id === 'string' &&
            typeof (o as SceneObject).name === 'string' &&
            VALID_PROXIMITY.has((o as SceneObject).proximity) &&
            VALID_DIR.has((o as SceneObject).direction)
        )
      }
    } catch (err) {
      console.warn('[parseAIResponse] Failed to parse MEMORY_UPDATE JSON:', err)
    }
  }

  // ─── [COMBAT: {...}] ──────────────────────────────────────────────────────
  let combatEntry: ParsedAIResponse['combatEntry'] = null
  const { extracted: combatJson, cleaned: afterCombat } = stripTaggedBlock(text, 'COMBAT')
  text = afterCombat
  if (combatJson) {
    try {
      const parsed = JSON.parse(combatJson) as Record<string, unknown>
      if (
        typeof parsed.actor === 'string' &&
        typeof parsed.action === 'string' &&
        typeof parsed.result === 'string'
      ) {
        combatEntry = {
          round: typeof parsed.round === 'number' ? parsed.round : 0,
          actorId: typeof parsed.actorId === 'string' ? parsed.actorId : (parsed.actor as string),
          actorName: parsed.actor as string,
          targetId: typeof parsed.targetId === 'string' ? parsed.targetId : '',
          targetName: typeof parsed.targetName === 'string' ? parsed.targetName : '',
          action: parsed.action as string,
          roll: typeof parsed.roll === 'number' ? parsed.roll : undefined,
          modifier: typeof parsed.modifier === 'number' ? parsed.modifier : undefined,
          total: typeof parsed.total === 'number' ? parsed.total : undefined,
          dc: typeof parsed.dc === 'number' ? parsed.dc : undefined,
          result: parsed.result as CombatEntry['result'],
          damage: typeof parsed.damage === 'number' ? parsed.damage : undefined,
          hpAfter: typeof parsed.hpAfter === 'number' ? parsed.hpAfter : undefined,
          hpMax: typeof parsed.hpMax === 'number' ? parsed.hpMax : undefined,
          narrative: typeof parsed.narrative === 'string' ? parsed.narrative : '',
        }
      } else {
        console.warn('[parseAIResponse] COMBAT block missing required fields')
      }
    } catch (err) {
      console.warn('[parseAIResponse] Failed to parse COMBAT JSON:', err)
    }
  }

  // ─── [SKILL_CHECK: {...}] and [SAVING_THROW: {...}] ─────────────────────
  let skillCheck: SkillCheck | null = null

  const parseCheck = (json: string): SkillCheck | null => {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>
      if (typeof parsed.skill === 'string' && typeof parsed.dc === 'number') {
        return {
          skill: parsed.skill,
          stat: (['str','dex','con','int','wis','cha'].includes(parsed.stat as string)
            ? parsed.stat : 'cha') as SkillCheck['stat'],
          dc: parsed.dc,
          description: typeof parsed.description === 'string' ? parsed.description : undefined,
        }
      }
    } catch { /* malformed */ }
    return null
  }

  const { extracted: scJson, cleaned: afterSc } = stripTaggedBlock(text, 'SKILL_CHECK')
  text = afterSc
  if (scJson) skillCheck = parseCheck(scJson)

  // Saving throws use the same mechanic — route through skillCheck if no skill check already
  if (!skillCheck) {
    const { extracted: stJson, cleaned: afterSt } = stripTaggedBlock(text, 'SAVING_THROW')
    text = afterSt
    if (stJson) skillCheck = parseCheck(stJson)
  }

  // ─── Clean up any remaining stray brackets from malformed tags ────────────
  const narrative = text.replace(/\[\w+:[^\]]{0,20}$/gm, '').trim()

  return { narrative, actions, memoryPatch, xpGained, combatEntry, combatStart, skillCheck }
}
