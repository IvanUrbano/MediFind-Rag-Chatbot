import { ShieldAlert } from 'lucide-react'

export const MEDICAL_DISCLAIMER =
  'MediFind PH provides general OTC medicine information and does not replace professional medical advice.'

export default function Disclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="px-4 pb-2 text-center text-[11px] leading-relaxed text-slate-400">
        {MEDICAL_DISCLAIMER}
      </p>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/35 px-4 py-3 text-sm text-brand-800 backdrop-blur-md">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      <p className="leading-relaxed">{MEDICAL_DISCLAIMER}</p>
    </div>
  )
}
