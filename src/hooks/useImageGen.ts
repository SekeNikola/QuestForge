import { useState } from 'react'
import type { Character, Theme } from '../types/index'

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='%231a1a2e'/%3E%3Ccircle cx='128' cy='96' r='40' fill='%232d2d4e'/%3E%3Cellipse cx='128' cy='200' rx='64' ry='48' fill='%232d2d4e'/%3E%3C/svg%3E`

const SCENE_STYLE: Record<Theme, string> = {
  dark_fantasy:  'photorealistic, hyperdetailed, cinematic photography, 8k, volumetric fog, dramatic chiaroscuro lighting, stone textures, dark medieval atmosphere',
  lego_universe: 'Lego 3D render, ultra-detailed plastic bricks, vibrant colours, studio lighting, raytracing, toy photography',
  space_odyssey: 'photorealistic sci-fi, hyperdetailed, cinematic photography, 8k, holographic panels, neon glow, metallic surfaces, cosmic backdrop',
  pirate_seas:   'photorealistic, hyperdetailed, cinematic photography, 8k, golden hour sunlight, ocean spray, weathered wood, dramatic sky',
  horror_manor:  'photorealistic, hyperdetailed, cinematic photography, 8k, moonlit fog, candlelight, crumbling stone, oppressive shadows',
}

const PORTRAIT_STYLE: Record<Theme, string> = {
  dark_fantasy:  'photorealistic portrait, professional studio lighting, 8k, intricate armour and costume detail, dark fantasy aesthetic',
  lego_universe: 'Lego minifigure character portrait, ultra-detailed, studio lighting, raytracing, toy photography',
  space_odyssey: 'photorealistic portrait, 8k, futuristic costume, neon accent lighting, sci-fi aesthetic',
  pirate_seas:   'photorealistic portrait, 8k, natural sidelight, weathered skin, period-accurate pirate costume',
  horror_manor:  'photorealistic portrait, 8k, candlelit, dramatic shadows, gothic aesthetic',
}

function buildPortraitUrl(character: Character, theme: Theme, seed: number): string {
  const backstoryExcerpt = character.backstory.split('.')[0]?.substring(0, 60) ?? ''
  const prompt = `${PORTRAIT_STYLE[theme]}, ${character.class}, ${backstoryExcerpt}, sharp focus, no text, no UI`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}&model=flux`
}

function buildSceneUrl(location: string, narration: string, theme: Theme, seed: number): string {
  const sentences = narration.split(/(?<=[.!?])\s+/).filter(Boolean)
  const sceneDesc = sentences.slice(0, 3).join(' ').substring(0, 180)
  const prompt = `${SCENE_STYLE[theme]}, ${location}, ${sceneDesc}, no people, no characters, no text, no UI, sharp focus`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=896&height=512&nologo=true&seed=${seed}&model=flux`
}

export function useImageGen() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generatePortrait = (character: Character, theme: Theme): string => {
    const seed = Math.floor(Math.random() * 100000)
    const url = buildPortraitUrl(character, theme, seed)
    setCurrentImageUrl(url)
    setIsGenerating(true)
    setError(null)
    return url
  }

  const generateScene = (location: string, narration: string, theme: Theme): string => {
    const seed = Math.floor(Math.random() * 100000)
    const url = buildSceneUrl(location, narration, theme, seed)
    setCurrentImageUrl(url)
    setIsGenerating(true)
    setError(null)
    return url
  }

  const handleImageLoad = () => setIsGenerating(false)
  const handleImageError = () => {
    setIsGenerating(false)
    setError('Image failed to load')
    setCurrentImageUrl(PLACEHOLDER_SVG)
  }

  return {
    generatePortrait,
    generateScene,
    isGenerating,
    currentImageUrl,
    error,
    handleImageLoad,
    handleImageError,
    placeholderSvg: PLACEHOLDER_SVG,
  }
}
