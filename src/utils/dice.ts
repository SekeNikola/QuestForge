// Dice rolling utilities — cryptographically random via crypto.getRandomValues
// Pure functions, no side effects — fully unit-testable

/**
 * Roll a single die with the given number of sides.
 * Uses crypto.getRandomValues for unbiased randomness.
 * Result: 1..sides (inclusive)
 */
export function roll(sides: number): number {
  if (sides < 1) throw new RangeError(`sides must be >= 1, got ${sides}`)
  const arr = new Uint32Array(1)
  // Rejection-sampling to eliminate modulo bias
  const limit = Math.floor(0xFFFFFFFF / sides) * sides
  let val: number
  do {
    crypto.getRandomValues(arr)
    val = arr[0]!
  } while (val >= limit)
  return (val % sides) + 1
}

export interface RollResult {
  roll: number
  modifier: number
  total: number
}

/**
 * Roll a die and add a modifier (can be negative).
 */
export function rollWithModifier(sides: number, modifier: number): RollResult {
  const r = roll(sides)
  return {
    roll: r,
    modifier,
    total: r + modifier,
  }
}

// ─── d20 specific helpers ─────────────────────────────────────────────────────

/** Natural 20 = critical hit */
export function isCrit(rollValue: number): boolean {
  return rollValue === 20
}

/** Natural 1 = automatic miss */
export function isMiss(rollValue: number): boolean {
  return rollValue === 1
}

// ─── Named die shortcuts ──────────────────────────────────────────────────────

export const d4  = (): number => roll(4)
export const d6  = (): number => roll(6)
export const d8  = (): number => roll(8)
export const d10 = (): number => roll(10)
export const d12 = (): number => roll(12)
export const d20 = (): number => roll(20)

// ─── Stat modifier (D&D style: floor((stat - 10) / 2)) ───────────────────────

export function statModifier(stat: number): number {
  return Math.floor((stat - 10) / 2)
}

// ─── Class weapon dice ────────────────────────────────────────────────────────

export const weaponDiceByClass: Record<string, number> = {
  Fighter: 8,  // d8 longsword
  Mage:    4,  // d4 dagger / cantrip
  Rogue:   6,  // d6 shortsword
  Ranger:  6,  // d6 shortbow
}

export function rollWeaponDamage(characterClass: string): number {
  const sides = weaponDiceByClass[characterClass] ?? 6
  return roll(sides)
}
