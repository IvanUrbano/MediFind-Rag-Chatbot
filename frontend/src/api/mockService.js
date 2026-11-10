/**
 * Mock RAG service - used while the FastAPI backend is unfinished.
 *
 * Responses are DEMONSTRATIONS built only from verified records in
 * `medicines.js` (extracted from the MediFind source PDFs). They are
 * clearly labeled with `demo: true` and must never be presented as live,
 * verified medicine answers.
 */
import { findMedicineMatches, recognizedLabel, normalizeText } from '../utils/normalize.js'

const UNSUPPORTED_PATTERNS = [
  {
    test: /\b(diagnos|do i have|what disease|what illness|am i sick)\w*/i,
    reason: 'diagnosis',
  },
  {
    test: /\b(prescrib|should i take|recommend(?:ed)? (?:dose|dosage)|dosage for me|how (?:many|much) (?:mg|tablets?|capsules?) should|self-medicate for)\w*/i,
    reason: 'prescription or personalized dosage',
  },
]

const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening)|kumusta|magandang araw)\b/i
const ABOUT =
  /\b(about medifind|what is medifind|who are you|how do you work|what can you do)\b/i

const UNSWERABLE_ANSWER =
  "MediFind PH can't help with that request. I don't provide diagnoses, " +
  'prescriptions, or personalized dosage recommendations. I can share general ' +
  'OTC medicine information documented in the MediFind source leaflets — for ' +
  'example a brand\u2019s generic name, active ingredients, manufacturer, or FDA ' +
  'registration number.'

const GREETING_ANSWER =
  "Hello! I'm the MediFind PH assistant. I answer questions about Philippine OTC " +
  'medicines using the MediFind source leaflets (Volumes 1\u20133).\n\n' +
  'Try one of the example questions, or ask about a specific brand such as ' +
  'Biogesic, Dolfenal, Flanax, Saridon, Tempra, or Alaxan.'

const ABOUT_ANSWER =
  'MediFind PH is a retrieval-augmented generation (RAG) chatbot that answers ' +
  'questions about Philippine OTC medicines using the MediFind OTC leaflet ' +
  'volumes as its only source. It reports what the documents record and shows ' +
  'the exact filename and page for every claim so you can verify it.\n\n' +
  'It does not replace professional medical advice.'

const INSUFFICIENT_ANSWER =
  'I could not find enough information in the source documents to answer that ' +
  'question. Try naming a specific OTC brand from the MediFind leaflets — for ' +
  'example Biogesic, Dolfenal, Flanax, Saridon, Tempra, or Alaxan — and ask ' +
  'about its generic name, active ingredients, manufacturer, registered ' +
  'indications, or FDA registration number.'

function detectIntent(text) {
  const t = normalizeText(text)
  if (/\b(who (makes|manufacture)|manufacturer|manufactured by|made by)\b/.test(t)) {
    return 'manufacturer'
  }
  if (/\b(registration|reg no|reg number|fda (reg|number|no))\b/.test(t)) {
    return 'registration'
  }
  if (/\b(generic name|generic)\b/.test(t)) return 'generic'
  if (/\b(active ingredient|contains|composition)\b/.test(t)) return 'ingredients'
  if (/\b(used for|what is .* for|indication|uses of|para saan)\b/.test(t)) {
    return 'indications'
  }
  return 'default'
}

function describeRecord(record, intent) {
  switch (intent) {
    case 'manufacturer':
      return `${record.brand} is manufactured by ${record.manufacturer}.`
    case 'registration':
      return `The FDA registration number of ${record.brand} is ${record.registrationNumber}.`
    case 'generic':
      return `The generic name of ${record.brand} is ${record.genericName}.`
    case 'ingredients':
      return `The active ingredient(s) of ${record.brand}: ${record.activeIngredients.join(', ')}.`
    case 'indications':
      return record.indications
        ? `Documented uses of ${record.brand}: ${record.indications}`
        : `The source documents do not record indications for ${record.brand} (not available in the source).`
    default: {
      const bits = [
        `${record.brand} is recorded with generic name ${record.genericName}`,
        `strength ${record.strength}`,
        `dosage form ${record.dosageForm}`,
        `FDA Reg. No. ${record.registrationNumber}`,
        `manufacturer ${record.manufacturer}`,
      ]
      return `${bits.join('; ')}. See the structured card and source citation below.`
    }
  }
}

function uniqueSources(matches) {
  const seen = new Set()
  const sources = []
  for (const { record } of matches) {
    for (const citation of record.citations) {
      const key = `${citation.source}:${citation.page}:${citation.passage}`
      if (seen.has(key)) continue
      seen.add(key)
      sources.push({ ...citation })
    }
  }
  return sources
}

/**
 * Build a mock response shaped like the future backend contract:
 * { answer, status, sources, medicine, recognized, demo }
 */
export function mockChat(message, medicineContext = null) {
  const text = String(message || '').trim()

  // Browse Medicines can supply any of the 94 PDF-backed records directly.
  // This keeps the demo chat useful without duplicating the full catalog in
  // the frontend bundle; live mode still resolves the same FDA number through
  // the FastAPI/RAG pipeline.
  if (medicineContext?.id && medicineContext?.brand) {
    const record = {
      ...medicineContext,
      citations: Array.isArray(medicineContext.citations)
        ? medicineContext.citations
        : [],
    }
    return {
      answer: describeRecord(record, detectIntent(text)),
      status: 'ok',
      sources: record.citations.map((citation) => ({ ...citation })),
      medicine: [record],
      recognized: record.brand,
      demo: true,
    }
  }

  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (pattern.test.test(text)) {
      return {
        answer: UNSWERABLE_ANSWER,
        status: 'unsupported',
        sources: [],
        medicine: null,
        recognized: null,
        demo: true,
      }
    }
  }

  if (GREETING.test(text) && text.length < 40) {
    return {
      answer: GREETING_ANSWER,
      status: 'ok',
      sources: [],
      medicine: null,
      recognized: null,
      demo: true,
    }
  }

  if (ABOUT.test(text)) {
    return {
      answer: ABOUT_ANSWER,
      status: 'ok',
      sources: [],
      medicine: null,
      recognized: null,
      demo: true,
    }
  }

  const matches = findMedicineMatches(text)

  if (!matches.length) {
    return {
      answer: INSUFFICIENT_ANSWER,
      status: 'insufficient_evidence',
      sources: [],
      medicine: null,
      recognized: null,
      demo: true,
    }
  }

  const intent = detectIntent(text)
  const records = matches.map((m) => m.record)
  const answer =
    records.length === 1
      ? describeRecord(records[0], intent)
      : `I found ${records.length} matching records in the source documents. ` +
        'Each formulation is listed separately below so their details are not mixed.\n\n' +
        records.map((r) => describeRecord(r, intent)).join('\n')

  return {
    answer,
    status: 'ok',
    sources: uniqueSources(matches),
    medicine: records,
    recognized: recognizedLabel(matches),
    demo: true,
  }
}
