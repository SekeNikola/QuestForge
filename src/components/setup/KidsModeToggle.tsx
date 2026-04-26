import { useState } from 'react'
import { Shield } from 'lucide-react'
import { Toggle } from '../ui/Toggle'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useSettingsStore } from '../../store/settingsStore'

interface KidsModeToggleProps {
  isInSession?: boolean
}

export function KidsModeToggle({ isInSession = false }: KidsModeToggleProps) {
  const { kidsMode, setKidsMode } = useSettingsStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (enabled: boolean) => {
    if (!enabled && isInSession) {
      setShowConfirm(true)
      return
    }
    setKidsMode(enabled)
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-[#252545] bg-[#12122a]">
        <span className="w-10 h-10 bg-violet-600/20 border border-violet-500/30 rounded-xl flex items-center justify-center text-violet-400 shrink-0">
          <Shield size={19} strokeWidth={1.5} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[15px] leading-tight">Kids Mode</p>
          <p className="text-gray-400 text-sm mt-0.5">Safer content. No combat or intense themes.</p>
        </div>
        <Toggle checked={kidsMode} onChange={handleChange} />
      </div>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Disable Kids Mode?">
        <p className="text-gray-300 text-sm mb-6">
          Turning off Kids Mode will allow standard adventure content, including combat, danger, and mature themes. Are you sure?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setKidsMode(false); setShowConfirm(false) }}>
            Yes, disable Kids Mode
          </Button>
        </div>
      </Modal>
    </>
  )
}
