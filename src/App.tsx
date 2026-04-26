import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { AdventureScreen } from './screens/AdventureScreen'
import { useGameStore } from './store/gameStore'

type Screen = 'setup' | 'adventure'

export default function App() {
  const resetSession = useGameStore((s) => s.resetSession)

  const [screen, setScreen] = useState<Screen>('setup')

  const handleStart = () => setScreen('adventure')

  const handleEndCampaign = () => {
    resetSession()
    setScreen('setup')
  }

  if (screen === 'adventure') {
    return <AdventureScreen onEndCampaign={handleEndCampaign} />
  }

  return <SetupScreen onStart={handleStart} />
}
