// Sonnet pricing (claude-sonnet-4-5) as of 2025
// Input:  $3.00 per 1,000,000 tokens  → $0.000003 per token
// Output: $15.00 per 1,000,000 tokens → $0.000015 per token

const INPUT_COST_PER_TOKEN  = 3    / 1_000_000   // USD
const OUTPUT_COST_PER_TOKEN = 15   / 1_000_000   // USD

/**
 * Calculate total cost in USD for a given token usage.
 */
export function calcCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN
}

/**
 * Format a USD cost value as a readable string.
 * e.g. 0.003456 → "$0.0035"
 *      0.0000034 → "$0.000003"
 */
export function formatCost(usd: number): string {
  if (usd === 0) return '$0.0000'
  // Show at least 4 significant digits
  if (usd >= 0.01) return `$${usd.toFixed(4)}`
  // For very small amounts, use up to 6 decimal places
  return `$${usd.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`
}
