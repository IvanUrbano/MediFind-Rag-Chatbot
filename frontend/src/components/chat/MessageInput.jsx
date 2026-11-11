import { useEffect, useRef } from 'react'
import { ArrowUp } from 'lucide-react'

export default function MessageInput({ value, onChange, onSend, disabled }) {
  const textareaRef = useRef(null)

  function resize() {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }

  useEffect(() => {
    const frame = requestAnimationFrame(resize)
    return () => cancelAnimationFrame(frame)
  }, [value])

  function handleChange(event) {
    onChange(event.target.value)
    requestAnimationFrame(resize)
  }

  function submitMessage(message) {
    const clean = message.trim()
    if (!clean || disabled) return
    onSend(clean)
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      textareaRef.current?.focus()
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitMessage(value)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submitMessage(value)
    }
  }

  return (
    <div className="shrink-0 px-3 pb-1 pt-2 sm:px-6">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="chat-composer flex items-end gap-2 p-2 sm:p-2.5">
          <textarea
            ref={textareaRef}
            data-chat-input
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'MediFind PH is searching the documents…' : 'Ask about an OTC medicine…'}
            aria-label="Message"
            disabled={disabled}
            className="scrollbar-slim max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[13.5px] leading-6 text-ink placeholder:text-muted/80 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="btn btn-primary btn-mono mb-0.5 h-9 shrink-0 px-3"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <p className="mt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted/80">
          <kbd className="font-medium">Enter</kbd> to send · <kbd className="font-medium">Shift + Enter</kbd> for a new line
        </p>
      </form>
    </div>
  )
}
