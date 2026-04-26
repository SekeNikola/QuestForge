import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'

interface InputBarProps {
  onSend: (text: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function InputBar({ onSend, isLoading, disabled = false }: InputBarProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isSupported, isListening, transcript, startListening, stopListening } = useVoiceInput()

  // Sync transcript into input
  useEffect(() => {
    if (transcript) setValue(transcript)
  }, [transcript])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxH = 96 // ~4 lines
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
  }, [value])

  const handleSend = () => {
    const text = value.trim()
    if (!text || isLoading || disabled) return
    onSend(text)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleVoice = () => {
    if (isListening) stopListening()
    else startListening()
  }

  return (
    <div className="px-4 pb-3 pt-2 border-t border-[#2d2d4e] bg-[#0f0f1a]">
      <div
        className={[
          'flex items-end gap-2 bg-[#1a1a2e] border rounded-xl px-3 py-2 transition-colors',
          isLoading ? 'border-[#2d2d4e] opacity-70' : 'border-[#2d2d4e] focus-within:border-violet-500',
        ].join(' ')}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'The DM is thinking...' : 'What do you do?'}
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 bg-transparent resize-none text-gray-200 placeholder-gray-600 text-sm focus:outline-none leading-relaxed py-0.5 min-h-[28px] max-h-24 disabled:cursor-not-allowed"
          aria-label="Adventure input"
          aria-multiline="true"
        />

        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {/* Voice button */}
          {isSupported && (
            <button
              onClick={toggleVoice}
              disabled={isLoading || disabled}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              aria-pressed={isListening}
              className={[
                'p-1.5 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                isListening
                  ? 'text-red-400 bg-red-500/20 animate-pulse'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5',
              ].join(' ')}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!value.trim() || isLoading || disabled}
            aria-label="Send message"
            className={[
              'p-1.5 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              value.trim() && !isLoading
                ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/20'
                : 'text-gray-600',
            ].join(' ')}
          >
            {isLoading ? (
              <div className="w-4 h-4 border border-violet-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-1.5 pl-1">
        Enter to send · Shift+Enter for new line{isSupported ? ' · Mic for voice' : ''}
      </p>
    </div>
  )
}

// React needed for JSX
import React from 'react'
void React
