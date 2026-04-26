import React, { memo, useState } from 'react'
import { useTokenTracker } from '../../hooks/useTokenTracker'
import { formatCost } from '../../utils/costEstimate'
import { Coins } from 'lucide-react'

export const TokenBadge = memo(function TokenBadge() {
  const {
    sessionInputTokens, sessionOutputTokens, sessionCostUsd,
    allTimeInputTokens, allTimeOutputTokens, allTimeCostUsd,
  } = useTokenTracker()
  const [showTooltip, setShowTooltip] = useState(false)

  const allTimeTotal = allTimeInputTokens + allTimeOutputTokens

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1a1a2e] border border-[#2d2d4e] text-gray-400 hover:text-gray-200 transition-colors text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label={`${allTimeTotal.toLocaleString()} total tokens, all-time cost ${formatCost(allTimeCostUsd)}`}
      >
        <Coins size={12} />
        <span>{allTimeTotal.toLocaleString()} tk</span>
        <span className="text-gray-500">•</span>
        <span className="text-amber-400">{formatCost(allTimeCostUsd)}</span>
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full right-0 mb-2 w-52 bg-[#0f0f1a] border border-[#2d2d4e] rounded-lg p-3 text-xs shadow-xl z-50"
        >
          <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-2">This session</p>
          <div className="flex justify-between text-gray-400 mb-1">
            <span>In / Out</span>
            <span className="text-gray-200 font-mono">{sessionInputTokens.toLocaleString()} / {sessionOutputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-400 mb-3">
            <span>Cost</span>
            <span className="text-amber-300 font-mono">{formatCost(sessionCostUsd)}</span>
          </div>
          <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-2">All time</p>
          <div className="flex justify-between text-gray-400 mb-1">
            <span>In / Out</span>
            <span className="text-gray-200 font-mono">{allTimeInputTokens.toLocaleString()} / {allTimeOutputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Total cost</span>
            <span className="text-amber-300 font-mono">{formatCost(allTimeCostUsd)}</span>
          </div>
        </div>
      )}
    </div>
  )
})

// Suppress unused import warning for React
void React
