import { memo } from 'react'
import { TokenBadge } from './TokenBadge'

// Re-exports TokenBadge as TokenMeter for the architecture/task naming
export const TokenMeter = memo(function TokenMeter() {
  return <TokenBadge />
})
