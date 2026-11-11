/**
 * Pharmaceutical entity normalization for the UI.
 *
 * Matches free-text questions against verified medicine records by brand,
 * generic name, active ingredient, and explicit aliases. Matching is
 * case-insensitive and respects word boundaries so "flan" does not match
 * "Flanax" and short tokens do not match inside unrelated words.
 */
import { MEDICINE_RECORDS } from '../api/medicines.js'

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s+/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary containment check on an already-normalized string. */
export function containsTerm(normalizedQuery, term) {
  if (!term) return false
  const pattern = `(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`
  return new RegExp(pattern).test(normalizedQuery)
}

/**
 * Return every verified record mentioned in ``text``.
 * Each match: { record, matchedTerm } - matchedTerm is the longest term hit.
 * Multiple formulations of the same brand are returned as separate matches
 * so their details are never mixed together.
 */
export function findMedicineMatches(text) {
  const query = normalizeText(text)
  if (!query) return []

  const matches = []
  for (const record of MEDICINE_RECORDS) {
    const terms = [
      record.brand,
      record.genericName,
      ...record.activeIngredients,
      ...record.aliases,
    ]
      .filter(Boolean)
      .map(normalizeText)

    let best = ''
    for (const term of terms) {
      if (containsTerm(query, term) && term.length > best.length) {
        best = term
      }
    }
    if (best) matches.push({ record, matchedTerm: best })
  }

  return matches.sort((a, b) => b.matchedTerm.length - a.matchedTerm.length)
}

/** Human-readable normalization label, e.g. "Biogesic 325 mg Tablet". */
export function recognizedLabel(matches) {
  if (!matches.length) return null
  return matches.map((m) => m.record.brand).join(' · ')
}
