/**
 * Centralized API service for MediFind PH.
 *
 * Mock mode (VITE_MOCK_MODE=true, the default) answers locally with clearly
 * labeled demonstration responses. Set VITE_MOCK_MODE=false to call the real
 * backend: POST {VITE_API_URL}/api/chat with { message } and receive
 * { answer, status, sources, medicine? }.
 */
import { mockChat } from './mockService.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
)
const MOCK_MODE =
  String(import.meta.env.VITE_MOCK_MODE ?? 'true').toLowerCase() !== 'false'

export function isMockMode() {
  return MOCK_MODE
}

export function getApiUrl() {
  return API_URL
}

export class ApiError extends Error {
  constructor(message, { type = 'unknown', status = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.type = type
    this.status = status
  }
}

function normalizeSources(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => s && typeof s.source === 'string' && s.source)
    .map((s) => ({
      source: s.source,
      page: typeof s.page === 'number' ? s.page : null,
      passage: typeof s.passage === 'string' ? s.passage : '',
    }))
}

function normalizeMedicine(raw) {
  if (!raw) return null
  return Array.isArray(raw) ? raw.filter(Boolean) : [raw]
}

function normalizeResponse(data) {
  const validStatuses = ['ok', 'insufficient_evidence', 'unsupported']
  return {
    answer:
      typeof data.answer === 'string' && data.answer
        ? data.answer
        : 'The backend returned an empty answer.',
    status: validStatuses.includes(data.status) ? data.status : 'ok',
    sources: normalizeSources(data.sources),
    medicine: normalizeMedicine(data.medicine ?? data.medicines),
    recognized: typeof data.recognized === 'string' ? data.recognized : null,
    demo: false,
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Send a chat message; resolves to the normalized response contract. */
export async function sendChat(message, { signal, medicineContext } = {}) {
  if (MOCK_MODE) {
    await delay(350 + Math.random() * 400)
    if (signal?.aborted) {
      throw new ApiError('Request cancelled.', { type: 'abort' })
    }
    return mockChat(message, medicineContext)
  }

  let response
  try {
    response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Request cancelled.', { type: 'abort' })
    }
    throw new ApiError(
      'Could not reach the MediFind PH backend. Check that it is running, then try again.',
      { type: 'network' },
    )
  }

  if (!response.ok) {
    throw new ApiError(
      `The backend returned an error (HTTP ${response.status}). Please try again.`,
      { type: 'http', status: response.status },
    )
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ApiError('The backend returned an unreadable response.', {
      type: 'parse',
    })
  }

  return normalizeResponse(data)
}
