/**
 * Conversation store: create / rename / delete / switch chats with
 * optional localStorage persistence.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { deriveTitle, uid } from '../utils/format'

const STORAGE_KEY = 'medifind-ph:conversations:v1'
const MAX_CONVERSATIONS = 30
const DEFAULT_TITLE = 'New chat'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { conversations: [], activeId: null }
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.conversations)) {
      return { conversations: [], activeId: null }
    }
    const conversations = data.conversations
      .filter(
        (c) =>
          c &&
          typeof c.id === 'string' &&
          typeof c.title === 'string' &&
          Array.isArray(c.messages),
      )
      .slice(0, MAX_CONVERSATIONS)
    const activeId = conversations.some((c) => c.id === data.activeId)
      ? data.activeId
      : null
    return { conversations, activeId }
  } catch {
    return { conversations: [], activeId: null }
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable - conversation still works in memory.
  }
}

export function useConversations() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    persist(state)
  }, [state])

  const conversations = state.conversations
  const activeId = state.activeId
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )

  const newConversation = useCallback(() => {
    const conversation = {
      id: uid(),
      title: DEFAULT_TITLE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    }
    setState((prev) => ({
      conversations: [conversation, ...prev.conversations].slice(
        0,
        MAX_CONVERSATIONS,
      ),
      activeId: conversation.id,
    }))
    return conversation.id
  }, [])

  const selectConversation = useCallback((id) => {
    setState((prev) =>
      prev.conversations.some((c) => c.id === id)
        ? { ...prev, activeId: id }
        : prev,
    )
  }, [])

  const renameConversation = useCallback((id, title) => {
    const clean = String(title || '').replace(/\s+/g, ' ').trim()
    if (!clean) return
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.id === id ? { ...c, title: clean, updatedAt: Date.now() } : c,
      ),
    }))
  }, [])

  const deleteConversation = useCallback((id) => {
    setState((prev) => {
      const conversations = prev.conversations.filter((c) => c.id !== id)
      const activeId =
        prev.activeId === id ? conversations[0]?.id ?? null : prev.activeId
      return { conversations, activeId }
    })
  }, [])

  const clearConversation = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.id === id
          ? { ...c, messages: [], title: DEFAULT_TITLE, updatedAt: Date.now() }
          : c,
      ),
    }))
  }, [])

  const appendMessage = useCallback((conversationId, message) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => {
        if (c.id !== conversationId) return c
        const isFirstUserMessage =
          c.messages.length === 0 &&
          message.role === 'user' &&
          c.title === DEFAULT_TITLE
        return {
          ...c,
          title: isFirstUserMessage ? deriveTitle(message.content) : c.title,
          messages: [...c.messages, message],
          updatedAt: Date.now(),
        }
      }),
    }))
  }, [])

  const patchMessage = useCallback((conversationId, messageId, patch) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => {
        if (c.id !== conversationId) return c
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
          updatedAt: Date.now(),
        }
      }),
    }))
  }, [])

  /**
   * Keep every message in the selected conversation. A conversation is only
   * split when the user explicitly creates a new chat.
   */
  const ensureConversation = useCallback(
    (firstText) => {
      if (activeConversation) return activeConversation.id
      const conversation = {
        id: uid(),
        title: deriveTitle(firstText),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      }
      setState((prev) => ({
        conversations: [conversation, ...prev.conversations].slice(
          0,
          MAX_CONVERSATIONS,
        ),
        activeId: conversation.id,
      }))
      return conversation.id
    },
    [activeConversation],
  )

  return {
    conversations,
    activeId,
    activeConversation,
    newConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    clearConversation,
    appendMessage,
    patchMessage,
    ensureConversation,
  }
}
