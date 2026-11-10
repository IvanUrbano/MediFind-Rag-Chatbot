/** Small formatting helpers shared across components. */

let counter = 0

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  counter += 1
  return `id-${Date.now()}-${counter}`
}

export function formatTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function dayGroup(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((startOfToday - startOfDay) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 7) return 'Previous 7 days'
  return 'Older'
}

/** Auto conversation title from the first user message. */
export function deriveTitle(text, maxLength = 48) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return 'New chat'
  return clean.length > maxLength ? `${clean.slice(0, maxLength).trimEnd()}…` : clean
}
