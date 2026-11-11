/**
 * Chat engine: sends messages through the API layer, appends user and
 * assistant messages to the right conversation, and tracks loading/error
 * state with retry support.
 */
import { useCallback, useRef, useState } from 'react'
import { sendChat } from '../api/client'
import { uid } from '../utils/format'

function buildAssistantMessage(response) {
  return {
    id: uid(),
    role: 'assistant',
    content: response.answer,
    status: response.status,
    sources: response.sources ?? [],
    medicines: response.medicine ?? [],
    recognized: response.recognized ?? null,
    demo: Boolean(response.demo),
    timestamp: Date.now(),
  }
}

function buildErrorMessage(error) {
  return {
    id: uid(),
    role: 'assistant',
    status: 'error',
    content:
      error?.message ||
      'Something went wrong while contacting MediFind PH. Please try again.',
    sources: [],
    medicines: [],
    recognized: null,
    demo: false,
    timestamp: Date.now(),
  }
}

export function useChat({ ensureConversation, appendMessage, patchMessage }) {
  const [isSending, setIsSending] = useState(false)
  const [retryState, setRetryState] = useState(null) // { convId, userText, messageId, medicineContext }
  const inflight = useRef(false)

  const send = useCallback(
    async (rawText, { medicineContext = null } = {}) => {
      const text = String(rawText || '').trim()
      if (!text || inflight.current) return

      inflight.current = true
      setIsSending(true)
      setRetryState(null)

      const convId = ensureConversation(text)
      appendMessage(convId, {
        id: uid(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      })

      try {
        const response = await sendChat(text, { medicineContext })
        appendMessage(convId, buildAssistantMessage(response))
      } catch (error) {
        const errorMessage = buildErrorMessage(error)
        appendMessage(convId, errorMessage)
        setRetryState({ convId, userText: text, messageId: errorMessage.id, medicineContext })
      } finally {
        inflight.current = false
        setIsSending(false)
      }
    },
    [ensureConversation, appendMessage],
  )

  const retry = useCallback(async () => {
    if (!retryState || inflight.current) return
    const { convId, userText, messageId, medicineContext } = retryState

    inflight.current = true
    setIsSending(true)
    setRetryState(null)

    try {
      const response = await sendChat(userText, { medicineContext })
      patchMessage(convId, messageId, {
        ...buildAssistantMessage(response),
        id: messageId,
      })
    } catch (error) {
      patchMessage(convId, messageId, {
        ...buildErrorMessage(error),
        id: messageId,
        timestamp: Date.now(),
      })
      setRetryState({ convId, userText, messageId, medicineContext })
    } finally {
      inflight.current = false
      setIsSending(false)
    }
  }, [retryState, patchMessage])

  return { send, retry, isSending, retryState }
}
