import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronRight, Library, LoaderCircle, Search, X } from 'lucide-react'
import { fetchMedicineCatalog, filterMedicineCatalog } from '../../api/catalog.js'
import Disclaimer from '../common/Disclaimer.jsx'
import MedicineDetailModal from './MedicineDetailModal.jsx'

const MISSING = 'Not available in the source'

function CatalogCard({ medicine, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(medicine)} className="shortcut-card group flex min-h-[230px] flex-col rounded-[22px] p-4 text-left sm:p-5">
      <div className="flex w-full items-start justify-between gap-3">
        <span className="rounded-full border border-teal-200/70 bg-teal-50/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">{medicine.category}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" />
      </div>
      <h3 className="mt-4 text-base font-bold leading-snug text-slate-900">{medicine.brand}</h3>
      <p className={`mt-1.5 text-sm ${medicine.genericName ? 'text-slate-600' : 'italic text-slate-400'}`}>{medicine.genericName || MISSING}</p>
      <dl className="mt-auto grid w-full grid-cols-2 gap-2 border-t border-white/55 pt-4 text-xs">
        <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Strength</dt><dd className={`mt-1 ${medicine.strength ? 'text-slate-700' : 'italic text-slate-400'}`}>{medicine.strength || MISSING}</dd></div>
        <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Dosage form</dt><dd className={`mt-1 ${medicine.dosageForm ? 'text-slate-700' : 'italic text-slate-400'}`}>{medicine.dosageForm || MISSING}</dd></div>
      </dl>
    </button>
  )
}

function LoadingGrid() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <div key={index} className="h-[230px] animate-pulse rounded-[22px] border border-white/50 bg-white/25" />)}</div>
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
    <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="glass-panel rounded-[26px] p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700"><Library className="h-4 w-4" />Medicine catalog</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Browse documented OTC medicines</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore every individual product record extracted from the three MediFind PDFs. Strengths, flavors, and dosage forms remain separate.</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/60 bg-white/35 px-4 py-3 text-center"><strong className="block text-2xl text-teal-700">{loading ? '—' : catalog.total}</strong><span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">PDF records</span></div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_300px]">
            <label className="relative block">
              <span className="sr-only">Search medicine catalog</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brand, generic, ingredient, or FDA registration…" className="w-full rounded-2xl border border-white/65 bg-white/55 py-3.5 pl-11 pr-10 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-teal-400 focus:outline-none" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear catalog search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-white/70 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </label>
            <label>
              <span className="sr-only">Filter by PDF category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-2xl border border-white/65 bg-white/55 px-4 py-3.5 text-sm text-slate-700 shadow-sm focus:border-teal-400 focus:outline-none">
                <option value="">All PDF categories</option>
                {catalog.categories.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.count})</option>)}
              </select>
            </label>
          </div>
        </section>

        <div className="mb-3 mt-5 flex items-center justify-between gap-3 px-1 text-sm text-slate-600">
          <span>{loading ? 'Loading catalog…' : `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'} shown`}</span>
          {(query || category) && <button type="button" onClick={() => { setQuery(''); setCategory('') }} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Clear filters</button>}
        </div>

        {loading && <LoadingGrid />}
        {!loading && error && <div className="glass-panel flex flex-col items-center rounded-[24px] px-5 py-12 text-center"><AlertCircle className="h-8 w-8 text-red-500" /><h3 className="mt-3 font-bold text-slate-800">Catalog unavailable</h3><p className="mt-1 max-w-md text-sm text-slate-600">{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white"><LoaderCircle className="h-4 w-4" />Try again</button></div>}
        {!loading && !error && filtered.length > 0 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((medicine) => <CatalogCard key={medicine.id} medicine={medicine} onOpen={setSelected} />)}</div>}
        {!loading && !error && filtered.length === 0 && <div className="glass-panel rounded-[24px] px-5 py-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-3 font-bold text-slate-800">No medicines found</h3><p className="mt-1 text-sm text-slate-500">Try a brand, generic name, ingredient, FDA number, or another category.</p></div>}

        <div className="mt-5"><Disclaimer /></div>
      </div>

      {selected && <MedicineDetailModal medicine={selected} onClose={() => setSelected(null)} onAskAI={(medicine) => { setSelected(null); onAskAI(medicine) }} />}
    </div>
  )
}
