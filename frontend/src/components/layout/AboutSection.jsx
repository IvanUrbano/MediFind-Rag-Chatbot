import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import Disclaimer from '../common/Disclaimer'

export default function AboutSection({ open: controlledOpen, onToggle }) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = controlledOpen ?? localOpen
  const toggle = onToggle ?? (() => setLocalOpen((value) => !value))

  return (
    <div className="shrink-0 border-t border-white/45">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-white/35 hover:text-slate-900"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-brand-600" aria-hidden="true" />
          About MediFind PH
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="scrollbar-slim max-h-[46dvh] space-y-3 overflow-y-auto overscroll-contain px-4 pb-5 text-[13px] leading-relaxed text-slate-600">
          <p>
            MediFind PH is a retrieval-augmented generation (RAG) chatbot that
            answers questions about Philippine OTC medicines using the MediFind
            OTC leaflet volumes (Pain–Fever–Muscle, Cold–Cough–Allergy–Throat,
            Digestive–Antiseptic–Eye) as its only source.
          </p>
          <p>
            Every answer cites the source PDF and page so you can verify it.
            Information missing from the leaflets is reported as “Not available
            in the source” rather than invented.
          </p>
          <Disclaimer />
        </div>
      )}
    </div>
  )
}
