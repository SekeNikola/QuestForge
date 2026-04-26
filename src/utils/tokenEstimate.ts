/**
 * Client-side token count approximation.
 * Rule of thumb: ~4 characters per token for English prose.
 * Used for live estimates while waiting for API response.
 * Replaced by actual usage.input_tokens / usage.output_tokens on completion.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}
