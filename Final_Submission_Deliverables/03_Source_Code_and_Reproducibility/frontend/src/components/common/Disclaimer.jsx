import { ShieldAlert } from 'lucide-react'

export const MEDICAL_DISCLAIMER =
  'MediFind PH provides general OTC medicine information and does not replace professional medical advice.'

export default function Disclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="px-4 pb-2 text-center text-[11px] leading-relaxed text-muted">
        {MEDICAL_DISCLAIMER}
      </p>
    )
  }

  return (
    <div className="flex items-start gap-2.5 border-l-2 border-line-strong py-1 pl-3 text-[12px] leading-6 text-muted">
      <ShieldAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden="true" />
      <p>{MEDICAL_DISCLAIMER}</p>
    </div>
  )
}
