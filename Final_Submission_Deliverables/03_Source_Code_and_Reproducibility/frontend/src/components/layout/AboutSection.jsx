import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import BrandMark from '../common/BrandMark'
import { MEDICAL_DISCLAIMER } from '../common/Disclaimer'

export default function AboutSection({ open: controlledOpen, onToggle }) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = controlledOpen ?? localOpen
  const toggle = onToggle ?? (() => setLocalOpen((value) => !value))

  return (
    <div className="shrink-0 border-t border-[#2b382f]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[12px] font-medium text-[#aeb8ae] transition-colors hover:bg-[#243027] hover:text-[#f0ecdf]"
      >
        <span className="flex items-center gap-2">
          <BrandMark className="h-4 w-4 shrink-0" />
          About MediFind PH
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#7f8b80] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="scrollbar-slim max-h-[46dvh] space-y-3 overflow-y-auto overscroll-contain px-4 pb-5 text-[11.5px] leading-6 text-[#aeb8ae]">
          <p>
            MediFind PH is a reference assistant for Philippine OTC medicines.
            It answers questions using the MediFind OTC leaflet volumes
            (Pain–Fever–Muscle, Cold–Cough–Allergy–Throat,
            Digestive–Antiseptic–Eye) as its only source.
          </p>
          <p>
            Every answer cites the source PDF and page so you can verify it.
            Information missing from the leaflets is reported as “Not recorded
            in the structured record” rather than invented.
          </p>
          <p className="border-l border-[#3c4a3f] pl-3 text-[10.5px] leading-5 text-[#8d9a8f]">
            {MEDICAL_DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  )
}
