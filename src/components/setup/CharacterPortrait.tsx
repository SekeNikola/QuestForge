import { useState } from 'react'
import { RefreshCw, User } from 'lucide-react'
import type { Character, Theme } from '../../types/index'
import { useImageGen } from '../../hooks/useImageGen'
import { Button } from '../ui/Button'

interface CharacterPortraitProps {
  character: Character
  theme: Theme
  onPortraitGenerated?: (url: string) => void
}

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='%231a1a2e'/%3E%3Ccircle cx='128' cy='96' r='40' fill='%232d2d4e'/%3E%3Cellipse cx='128' cy='200' rx='64' ry='48' fill='%232d2d4e'/%3E%3C/svg%3E`

export function CharacterPortrait({ character, theme, onPortraitGenerated }: CharacterPortraitProps) {
  const { generatePortrait, isGenerating, handleImageLoad, handleImageError } = useImageGen()
  const [imgUrl, setImgUrl] = useState<string>(character.portraitUrl || PLACEHOLDER)
  const [imgError, setImgError] = useState(false)

  const handleGenerate = () => {
    const url = generatePortrait(character, theme)
    setImgUrl(url)
    setImgError(false)
    onPortraitGenerated?.(url)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-[#2d2d4e] bg-[#1a1a2e]">
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80 z-10">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {imgError ? (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <User size={48} />
          </div>
        ) : (
          <img
            src={imgUrl}
            alt={`${character.name} portrait`}
            className="w-full h-full object-cover"
            onError={() => { setImgError(true); handleImageError() }}
            onLoad={handleImageLoad}
          />
        )}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleGenerate}
        loading={isGenerating}
        className="gap-2"
      >
        <RefreshCw size={13} />
        {imgUrl === PLACEHOLDER || imgError ? 'Generate Portrait' : 'Regenerate'}
      </Button>
      <p className="text-xs text-gray-500 text-center">
        AI-generated via Pollinations.ai
      </p>
    </div>
  )
}
