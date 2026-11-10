import { ApiError, getApiUrl } from './client.js'

function normalizeCitation(citation) {
  return {
    source: String(citation?.source || ''),
    page: typeof citation?.page === 'number' ? citation.page : null,
    passage: typeof citation?.passage === 'string' ? citation.passage : '',
  }
}

function normalizeRecord(record) {
  return {
    id: String(record?.id || ''),
    brand: String(record?.brand || 'Not available in the source'),
    genericName: record?.genericName || null,
    activeIngredients: Array.isArray(record?.activeIngredients)
      ? record.activeIngredients.filter(Boolean)
      : [],
    strength: record?.strength || null,
    dosageForm: record?.dosageForm || null,
    pharmacologicCategory: record?.pharmacologicCategory || null,
    category: record?.category || 'Other documented OTC medicines',
    registrationNumber: record?.registrationNumber || null,
    manufacturer: record?.manufacturer || null,
    indications: record?.indications || null,
    citations: Array.isArray(record?.citations)
      ? record.citations.map(normalizeCitation).filter((item) => item.source)
      : [],
  }
}

async function readJson(response) {
  if (!response.ok) {
    throw new ApiError(`The medicine catalog returned HTTP ${response.status}.`, {
      type: 'http',
      status: response.status,
    })
  }
  try {
    return await response.json()
  } catch {
    throw new ApiError('The medicine catalog returned unreadable data.', {
      type: 'parse',
    })
  }
}

export async function fetchMedicineCatalog({ signal } = {}) {
  let response
  try {
    response = await fetch(`${getApiUrl()}/api/medicines`, { signal })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(
      'Could not load the medicine catalog. Check that the FastAPI backend is running.',
      { type: 'network' },
    )
  }
  const data = await readJson(response)
  return {
    items: Array.isArray(data.items) ? data.items.map(normalizeRecord) : [],
    total: Number.isInteger(data.total) ? data.total : 0,
    categories: Array.isArray(data.categories) ? data.categories : [],
  }
}

export async function fetchMedicineDetail(id, { signal } = {}) {
  let response
  try {
    response = await fetch(
      `${getApiUrl()}/api/medicines/${encodeURIComponent(id)}`,
      { signal },
    )
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError('Could not load this medicine record.', { type: 'network' })
  }
  return normalizeRecord(await readJson(response))
}

export function filterMedicineCatalog(items, query, category) {
  const needle = String(query || '').trim().toLocaleLowerCase()
  return items.filter((item) => {
    if (category && item.category !== category) return false
    if (!needle) return true
    return [
      item.brand,
      item.genericName,
      item.registrationNumber,
      ...item.activeIngredients,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(needle))
  })
}
