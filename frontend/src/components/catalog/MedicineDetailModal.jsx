import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  ChevronDown,
  FileText,
  FlaskConical,
  Hash,
  LoaderCircle,
  MessageCircleMore,
  Pill,
  Stethoscope,
  X,
} from 'lucide-react'
import { fetchMedicineDetail } from '../../api/catalog.js'

const MISSING = 'Not available in the source'

function DetailField({ icon: Icon, label, value, wide = false }) {
  const missing = !value
  return (
    <div className={`min-w-0 rounded-2xl border border-white/65 bg-white/40 p-3.5 shadow-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden="true" />
        {label}
      </dt>
      <dd className={`mt-1.5 break-words text-sm leading-6 ${missing ? 'italic text-slate-400' : 'text-slate-700'}`}>
        {value || MISSING}
      </dd>
    </div>
  )
}

function Sources({ citations = [] }) {
  return (
    <section className="rounded-2xl border border-white/65 bg-white/40 p-4" aria-labelledby="medicine-sources-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="medicine-sources-title" className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <FileText className="h-4 w-4 text-teal-600" aria-hidden="true" />
          PDF citations
        </h3>
        {citations.length > 0 && <span className="rounded-full bg-teal-100/80 px-2 py-0.5 text-[11px] font-bold text-teal-700">{citations.length}</span>}
      </div>

      {citations.length ? (
        <ul className="mt-3 space-y-2">
          {citations.map((citation, index) => (
            <li key={`${citation.source}-${citation.page}-${index}`} className="rounded-xl border border-white/70 bg-white/45 px-3 py-3 text-xs text-slate-600">
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 break-words font-semibold leading-5 text-slate-700">{citation.source}</span>
                {citation.page != null && <span className="w-fit shrink-0 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-700">Page {citation.page}</span>}
              </div>
              {citation.passage && (
                <details className="group mt-2 border-t border-slate-200/60 pt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-teal-700 marker:content-none">
                    View supporting passage
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/45 p-2.5 leading-5 text-slate-600">{citation.passage}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-slate-400">{MISSING}</p>
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
    <div className="fixed inset-0 z-[60] flex h-screen max-h-screen items-stretch justify-center overflow-hidden bg-slate-950/30 backdrop-blur-md [height:100dvh] [max-height:100dvh] sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicine-detail-title"
        aria-describedby="medicine-detail-description"
        className="glass-panel flex h-screen max-h-screen w-full max-w-3xl flex-col overflow-hidden rounded-none shadow-2xl [height:100dvh] [max-height:100dvh] sm:h-[calc(100dvh-2rem)] sm:max-h-[800px] sm:rounded-[28px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-white/55 bg-white/25 px-4 py-3.5 pr-16 sm:px-6 sm:py-5 sm:pr-16">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-600/20 sm:h-12 sm:w-12 sm:rounded-2xl"><Pill className="h-5 w-5" /></span>
            <div className="min-w-0">
              <span className="inline-flex max-w-full rounded-full border border-teal-200/70 bg-teal-50/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-teal-700 sm:text-[10px]">{detail.category}</span>
              <h2 id="medicine-detail-title" className="mt-1.5 line-clamp-2 break-words text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">{detail.brand}</h2>
              <p id="medicine-detail-description" className="mt-1 hidden text-xs text-slate-500 sm:block">Structured medicine record from the MediFind PDF knowledge base</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close medicine details" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/75 bg-white/60 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:text-slate-900 hover:shadow-md active:translate-y-0 active:scale-95"><X className="h-5 w-5" /></button>
        </header>

        <div className="scrollbar-slim min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {loading && <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/60 bg-white/40 px-4 py-3 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin text-teal-600" />Loading documented details…</div>}
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50/75 px-4 py-3 text-sm leading-5 text-red-700">{error} The catalog summary is still available below.</div>}

          <dl className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <DetailField icon={FlaskConical} label="Generic name" value={detail.genericName} />
            <DetailField icon={FlaskConical} label="Active ingredients" value={ingredients} />
            <DetailField icon={Pill} label="Strength" value={detail.strength} />
            <DetailField icon={Pill} label="Dosage form" value={detail.dosageForm} />
            <DetailField icon={Hash} label="FDA registration number" value={detail.registrationNumber} />
            <DetailField icon={Building2} label="Manufacturer" value={detail.manufacturer} />
            <DetailField icon={FlaskConical} label="Pharmacologic category" value={detail.pharmacologicCategory} wide />
            <DetailField icon={Stethoscope} label="Documented indications" value={detail.indications} wide />
          </dl>

          <div className="mt-3"><Sources citations={detail.citations} /></div>
        </div>

        <footer className="grid shrink-0 grid-cols-[minmax(100px,0.38fr)_minmax(0,1fr)] gap-2.5 border-t border-white/60 bg-white/50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:flex sm:items-center sm:justify-end sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300/70 bg-white/60 px-4 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white/90 hover:text-slate-900 hover:shadow-md active:translate-y-0 active:scale-[0.98] sm:min-w-28">
            <X className="h-4 w-4" aria-hidden="true" />
            Close
          </button>
          <button type="button" onClick={() => onAskAI(detail)} disabled={loading} className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-600 to-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-700/20 transition-all hover:-translate-y-0.5 hover:from-teal-700 hover:to-emerald-700 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-lg sm:min-w-56">
            {loading ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <MessageCircleMore className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{loading ? 'Loading details…' : 'Ask MediFind AI'}</span>
          </button>
        </footer>
      </section>
    </div>
  )
}
