import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

export default function MessageList({
  messages,
  isSending,
  retryMessageId,
  onRetry,
  onFeedback,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isSending])

  return (
    <div
      className="scrollbar-slim flex-1 overflow-y-auto px-4 py-6 sm:px-8"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            canRetry={message.status === 'error' && message.id === retryMessageId}
            onRetry={onRetry}
            onFeedback={(value) => onFeedback?.(message.id, value)}
          />
        ))}
        {isSending && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  )
}
