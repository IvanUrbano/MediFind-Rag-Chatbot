import { useRef, useState } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'What is Biogesic used for?',
  'Medicines with naproxen sodium',
  'Active ingredients of Alaxan',
]

export default function MessageInput({ onSend, disabled, showSuggestions = false }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  function resize() {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }

  function handleChange(event) {
    setText(event.target.value)
    requestAnimationFrame(resize)
  }

  function submitMessage(message) {
    const clean = message.trim()
    if (!clean || disabled) return
    onSend(clean)
    setText('')
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      textareaRef.current?.focus()
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitMessage(text)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submitMessage(text)
    }
  }

  return (
    <div className="shrink-0 px-3 pb-1 pt-2 sm:px-6">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="composer-glass flex items-end gap-2 rounded-[24px] p-2 pl-3 transition-all focus-within:border-teal-300 focus-within:shadow-[0_16px_50px_rgba(13,148,136,0.15)] sm:pl-4">
          <Sparkles className="mb-3 hidden h-4 w-4 shrink-0 text-teal-500 sm:block" aria-hidden="true" />
          <textarea
            ref={textareaRef}
            data-chat-input
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'MediFind PH is searching the documents…' : 'Ask about an OTC medicine…'}
            aria-label="Message"
            disabled={disabled}
            className="scrollbar-slim max-h-40 min-h-[46px] flex-1 resize-none bg-transparent px-1 py-3 text-sm leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
          />
          <button type="submit" disabled={disabled || !text.trim()} aria-label="Send message" className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"><ArrowUp className="h-[18px] w-[18px]" /></button>
        </div>

        {showSuggestions && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5" aria-label="Example questions">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => submitMessage(suggestion)} disabled={disabled} className="rounded-full border border-white/55 bg-white/30 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/55 hover:text-teal-800 disabled:opacity-50">{suggestion}</button>
            ))}
          </div>
        )}

        <p className="mt-1.5 text-center text-[10px] text-slate-500/80"><kbd className="font-semibold">Enter</kbd> to send · <kbd className="font-semibold">Shift + Enter</kbd> for a new line</p>
      </form>
    </div>
  )
}
