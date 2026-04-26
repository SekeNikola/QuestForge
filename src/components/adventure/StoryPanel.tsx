import { useEffect, useRef, useState } from 'react'
import { Image } from 'lucide-react'
import type { MessageEntry } from '../../types/index'
import { useImageGen } from '../../hooks/useImageGen'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

interface StoryPanelProps {
  messages: MessageEntry[]
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function MessageBubble({ msg }: { msg: MessageEntry }) {
  const isAssistant = msg.role === 'assistant'
  const [imageUrl, setImageUrl] = useState<string | null>(msg.imageUrl ?? null)
  const [imgLoading, setImgLoading] = useState(false)
  const { generateScene } = useImageGen()
  const theme = useGameStore((s) => s.theme)
  const location = useGameStore((s) => s.currentLocation)

  const handleIllustrate = () => {
    if (!theme) return
    setImgLoading(true)
    const url = generateScene(location, msg.content, theme)
    setImageUrl(url)
  }

  return (
    <div className={`flex flex-col gap-1 ${isAssistant ? 'items-start' : 'items-end'}`}>
      {isAssistant ? (
        <div className="max-w-full">
          <p className="font-serif text-gray-200 leading-relaxed text-sm whitespace-pre-wrap">
            {msg.content}
          </p>
          {imageUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border border-[#2d2d4e]">
              <img
                src={imageUrl}
                alt="Scene illustration"
                className="w-full max-w-xs rounded-lg"
                onLoad={() => setImgLoading(false)}
                onError={() => setImgLoading(false)}
              />
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-600">{timeAgo(msg.timestamp)}</span>
            {!imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleIllustrate}
                loading={imgLoading}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 h-auto"
              >
                <Image size={11} />
                Illustrate scene
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-xs">
          <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl rounded-br-sm px-4 py-2.5">
            <p className="text-gray-300 text-sm">{msg.content}</p>
          </div>
          <div className="text-xs text-gray-600 mt-1 text-right">{timeAgo(msg.timestamp)}</div>
        </div>
      )}
    </div>
  )
}

export function StoryPanel({ messages }: StoryPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="text-4xl mb-3">⚔️</div>
          <p className="text-gray-500 text-sm font-serif italic">
            Your adventure begins. Send a message to start the story...
          </p>
        </div>
      ) : (
        messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
      )}
      <div ref={bottomRef} />
    </div>
  )
}
