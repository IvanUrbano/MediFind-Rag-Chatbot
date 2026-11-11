import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  FileText,
  LoaderCircle,
  MessageCircleMore,
  Pill,
  X,
} from 'lucide-react'
import { fetchMedicineDetail } from '../../api/catalog.js'

const MISSING = 'Not recorded in the structured record'

function DetailField({ label, value, wide = false }) {
  const missing = !value
  return (
    <div className={`min-w-0 border-b border-line py-2.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="font-mono text-[8.5px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className={`mt-1 break-words text-[12.5px] leading-6 ${missing ? 'italic text-muted/70' : 'text-ink'}`}>
        {value || MISSING}
      </dd>
    </div>
  )
}

function Sources({ citations = [] }) {
  return (
    <section className="mt-5 border-t border-line pt-3" aria-labelledby="medicine-sources-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="medicine-sources-title" className="flex items-center gap-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-brand-700">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          PDF citations
        </h3>
        {citations.length > 0 && <span className="font-mono text-[9px] text-muted">{citations.length}</span>}
      </div>

      {citations.length ? (
        <ul className="mt-1 divide-y divide-line">
          {citations.map((citation, index) => (
            <li key={`${citation.source}-${citation.page}-${index}`} className="py-3 text-xs text-muted">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="min-w-0 break-words font-mono text-[10.5px] leading-5 text-ink">{citation.source}</span>
                {citation.page != null && (
                  <span className="w-fit shrink-0 border border-line px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
                    p. {citation.page}
                  </span>
                )}
              </div>
              {citation.passage && (
                <details className="group mt-1.5">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted underline decoration-line-strong decoration-dotted underline-offset-4 marker:content-none hover:text-brand-700">
                    View supporting passage
                    <ChevronDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap border-l border-line pl-3 font-serif text-[13px] leading-6 text-muted">{citation.passage}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] italic text-muted/70">{MISSING}</p>
      )}
    </section>
  )
}

export default function MedicineDetailModal({ medicine, onClose, onAskAI }) {
  const [detail, setDetail] = useState(medicine)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    setDetail(medicine)
    setLoading(true)
    setError('')
    fetchMedicineDetail(medicine.id, { signal: controller.signal })
      .then(setDetail)
      .catch((reason) => {
        if (reason?.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [medicine])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const ingredients = detail.activeIngredients?.length
    ? detail.activeIngredients.join(' + ')
    : null

  return (
    <div
      className="fixed inset-0 z-[60] flex h-screen max-h-screen items-stretch justify-center overflow-hidden bg-[#1b2620]/55 [height:100dvh] [max-height:100dvh] sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicine-detail-title"
        aria-describedby="medicine-detail-description"
        className="panel flex h-screen max-h-screen w-full max-w-3xl flex-col overflow-hidden rounded-none [height:100dvh] [max-height:100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[12px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="h-[2px] shrink-0 bg-brass-400/80" aria-hidden="true" />

        <header className="relative shrink-0 border-b border-line bg-paper px-4 py-4 pr-16 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-brand-800 text-brass-200">
              <Pill className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex max-w-full font-mono text-[8.5px] font-medium uppercase tracking-[0.14em] text-brand-700">
                {detail.category}
              </span>
              <h2 id="medicine-detail-title" className="mt-1 line-clamp-2 break-words font-serif text-[20px] font-medium leading-snug tracking-tight text-ink sm:text-[24px]">
                {detail.brand}
              </h2>
              <p id="medicine-detail-description" className="mt-1 hidden text-[11px] text-muted sm:block">
                Structured medicine record from the MediFind PDF knowledge base
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close medicine details"
            className="btn btn-ghost btn-icon absolute right-4 top-4 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="scrollbar-slim min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {loading && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-line bg-paper-2 px-4 py-2.5 text-[11.5px] text-muted">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-600" />
              Loading documented details…
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-r-md border-l-2 border-red-700 bg-red-50 px-4 py-3 text-[11.5px] leading-5 text-red-800">
              {error} The catalog summary is still available below.
            </div>
          )}

          <dl className="grid gap-x-6 sm:grid-cols-2">
            <DetailField label="Generic name" value={detail.genericName} />
            <DetailField label="Active ingredients" value={ingredients} />
            <DetailField label="Strength" value={detail.strength} />
            <DetailField label="Dosage form" value={detail.dosageForm} />
            <DetailField label="FDA registration number" value={detail.registrationNumber} />
            <DetailField label="Manufacturer" value={detail.manufacturer} />
            <DetailField label="Pharmacologic category" value={detail.pharmacologicCategory} wide />
            <DetailField label="Documented indications" value={detail.indications} wide />
          </dl>

          <Sources citations={detail.citations} />
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-paper px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-mono h-10 sm:min-w-28">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Close
          </button>
          <button
            type="button"
            onClick={() => onAskAI(detail)}
            disabled={loading}
            className="btn btn-primary btn-mono h-10 min-w-0 flex-1 sm:min-w-56 sm:flex-none"
          >
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <MessageCircleMore className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{loading ? 'Loading details…' : 'Ask about this medicine'}</span>
          </button>
        </footer>
      </section>
    </div>
  )
}
