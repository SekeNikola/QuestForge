import { useState } from 'react'
import type { Character, Theme } from '../types/index'

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='%231a1a2e'/%3E%3Ccircle cx='128' cy='96' r='40' fill='%232d2d4e'/%3E%3Cellipse cx='128' cy='200' rx='64' ry='48' fill='%232d2d4e'/%3E%3C/svg%3E`

const THEME_LABELS: Record<Theme, string> = {
  dark_fantasy: 'dark medieval fantasy',
  lego_universe: 'Lego brick world, cartoon style',
  space_odyssey: 'futuristic sci-fi',
  pirate_seas: 'swashbuckling pirate',
  horror_manor: 'gothic horror',
}

function buildPortraitUrl(character: Character, theme: Theme, seed: number): string {
  const backstoryExcerpt = character.backstory.split('.')[0]?.substring(0, 60) ?? ''
  const prompt = `RPG character portrait, ${character.class}, ${THEME_LABELS[theme]} setting, ${backstoryExcerpt}, dramatic lighting, detailed, painterly fantasy art style, no text`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}&model=flux`
}

function buildSceneUrl(location: string, narration: string, theme: Theme, seed: number): string {
  // Use the opening sentences — they set the visual scene, not the last sentence
  const sentences = narration.split(/(?<=[.!?])\s+/).filter(Boolean)
  const sceneDesc = sentences.slice(0, 3).join(' ').substring(0, 200)
  const prompt = `${THEME_LABELS[theme]}, ${location}, ${sceneDesc}, dramatic illustration, cinematic lighting, detailed environment, no characters, no UI, no text`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}&model=flux`
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
