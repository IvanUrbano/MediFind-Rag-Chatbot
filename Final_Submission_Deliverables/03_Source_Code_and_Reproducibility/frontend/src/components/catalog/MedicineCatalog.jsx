import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronRight, Library, LoaderCircle, Search, X } from 'lucide-react'
import { fetchMedicineCatalog, filterMedicineCatalog } from '../../api/catalog.js'
import Disclaimer from '../common/Disclaimer.jsx'
import MedicineDetailModal from './MedicineDetailModal.jsx'

const MISSING = 'Not recorded in the structured record'

function CatalogCard({ medicine, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(medicine)}
      className="record-card group flex min-h-[236px] flex-col p-4 text-left sm:p-5"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.14em] text-brand-700">
          {medicine.category}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted/60 transition-all group-hover:translate-x-0.5 group-hover:text-brand-700" />
      </div>

      <h3 className="mt-4 font-serif text-[18px] font-medium leading-snug text-ink">
        {medicine.brand}
      </h3>
      <p className={`mt-1 text-[12.5px] ${medicine.genericName ? 'text-muted' : 'italic text-muted/70'}`}>
        {medicine.genericName || MISSING}
      </p>

      <dl className="mt-auto grid w-full grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
        <div>
          <dt className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">Strength</dt>
          <dd className={`mt-1 text-[12px] ${medicine.strength ? 'text-ink' : 'italic text-muted/70'}`}>
            {medicine.strength || MISSING}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">Dosage form</dt>
          <dd className={`mt-1 text-[12px] ${medicine.dosageForm ? 'text-ink' : 'italic text-muted/70'}`}>
            {medicine.dosageForm || MISSING}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted">FDA registration</dt>
          <dd className={`mt-1 font-mono text-[10px] tracking-[0.04em] ${medicine.registrationNumber ? 'text-ink' : 'italic text-muted/70'}`}>
            {medicine.registrationNumber || MISSING}
          </dd>
        </div>
      </dl>
    </button>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="h-[236px] animate-pulse border border-line bg-[#eae6dc]" />
      ))}
    </div>
  )
}

export default function MedicineCatalog({ onAskAI }) {
  const [catalog, setCatalog] = useState({ items: [], categories: [], total: 0 })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchMedicineCatalog({ signal: controller.signal })
      .then(setCatalog)
      .catch((reason) => {
        if (reason?.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [attempt])

  const filtered = useMemo(
    () => filterMedicineCatalog(catalog.items, query, category),
    [catalog.items, query, category],
  )

  return (
    <div className="canvas-grid scrollbar-slim min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-line pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-brand-700">
                <Library className="h-3.5 w-3.5" />
                Medicine catalog
              </div>
              <h2 className="mt-2.5 max-w-2xl font-serif text-[32px] font-medium leading-[1.04] tracking-[-0.02em] text-ink sm:text-[42px]">
                Browse documented OTC medicines
              </h2>
              <p className="mt-2.5 max-w-2xl text-[12.5px] leading-6 text-muted">
                Every individual product record extracted from the three MediFind PDFs.
                Strengths, flavors, and dosage forms remain separate.
              </p>
            </div>

            <div className="panel flex w-full shrink-0 divide-x divide-line sm:w-auto">
              <div className="flex-1 px-5 py-3 sm:flex-none">
                <strong className="block font-serif text-[26px] font-medium leading-none text-ink">
                  {loading ? '—' : catalog.total}
                </strong>
                <span className="mt-1.5 block font-mono text-[8.5px] uppercase tracking-[0.13em] text-muted">
                  Records
                </span>
              </div>
              <div className="flex-1 px-5 py-3 sm:flex-none">
                <strong className="block font-serif text-[26px] font-medium leading-none text-ink">3</strong>
                <span className="mt-1.5 block font-mono text-[8.5px] uppercase tracking-[0.13em] text-muted">
                  Source volumes
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <label className="relative block w-full">
              <span className="sr-only">Search medicine catalog</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search medicines or ingredients"
                className="field h-11 w-full pl-10 pr-10 text-[13px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear catalog search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#eae6da] hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by PDF category">
              <button
                type="button"
                onClick={() => setCategory('')}
                data-active={category === ''}
                className="chip"
                aria-pressed={category === ''}
              >
                All <span className="chip-count">{catalog.total}</span>
              </button>
              {catalog.categories.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setCategory((value) => (value === item.name ? '' : item.name))}
                  data-active={category === item.name}
                  className="chip"
                  aria-pressed={category === item.name}
                >
                  {item.name} <span className="chip-count">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mb-3 mt-4 flex items-center gap-3 text-[11px] text-muted">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em]">
            {loading ? 'Loading catalog…' : `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'} shown`}
          </span>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          {(query || category) && (
            <button
              type="button"
              onClick={() => { setQuery(''); setCategory('') }}
              className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-brand-700 underline decoration-line-strong decoration-dotted underline-offset-4 hover:text-brand-900"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && <LoadingGrid />}
        {!loading && error && (
          <div className="panel flex flex-col items-center px-5 py-12 text-center">
            <AlertCircle className="h-7 w-7 text-red-700" />
            <h3 className="mt-3 font-serif text-xl text-ink">Catalog unavailable</h3>
            <p className="mt-1 max-w-md text-[13px] text-muted">{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn btn-primary btn-mono mt-5">
              <LoaderCircle className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((medicine) => <CatalogCard key={medicine.id} medicine={medicine} onOpen={setSelected} />)}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="panel px-5 py-12 text-center">
            <Search className="mx-auto h-7 w-7 text-muted" />
            <h3 className="mt-3 font-serif text-xl text-ink">No medicines found</h3>
            <p className="mt-1 text-[13px] text-muted">Try a brand, generic name, ingredient, FDA number, or another category.</p>
          </div>
        )}

        <div className="mt-6"><Disclaimer /></div>
      </div>

      {selected && <MedicineDetailModal medicine={selected} onClose={() => setSelected(null)} onAskAI={(medicine) => { setSelected(null); onAskAI(medicine) }} />}
    </div>
  )
}
