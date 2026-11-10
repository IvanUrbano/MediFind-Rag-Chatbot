import { Beaker, FileText, FlaskConical, Pill, Search, Stethoscope } from 'lucide-react'

const SHORTCUTS = [
  { label: 'Find Medicine', icon: Search, color: 'text-teal-600 bg-teal-100/70', question: 'Which products contain naproxen sodium?' },
  { label: 'Generic Names', icon: Pill, color: 'text-sky-600 bg-sky-100/70', question: 'What is the generic name of Dolfenal?' },
  { label: 'Ingredients', icon: Beaker, color: 'text-violet-600 bg-violet-100/70', question: 'What are the active ingredients of Alaxan?' },
  { label: 'Formulations', icon: FlaskConical, color: 'text-fuchsia-600 bg-fuchsia-100/70', question: 'What formulations of Biogesic are documented?' },
  { label: 'Indications', icon: Stethoscope, color: 'text-rose-600 bg-rose-100/70', question: 'What is Dolfenal used for?' },
  { label: 'PDF Sources', icon: FileText, color: 'text-amber-600 bg-amber-100/70', question: 'Which source PDF documents Biogesic 500 mg Tablet?' },
]

function CapsuleOrb() {
  return (
    <div className="capsule-stage" aria-hidden="true">
      <div className="capsule-orbit"><span /></div>
      <div className="capsule-glow" />
      <div className="capsule-float">
        <div className="capsule-shape">
          <div className="capsule-half capsule-teal" />
          <div className="capsule-half capsule-white" />
          <span className="capsule-seam" />
          <span className="capsule-shine" />
        </div>
      </div>
    </div>
  )
}

export default function WelcomeScreen({ onExample }) {
  return (
    <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-4 pb-3 pt-6 text-center sm:px-8 sm:pt-8">
        <CapsuleOrb />
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-slate-900 sm:text-4xl">Welcome to <span className="bg-gradient-to-r from-teal-700 to-cyan-600 bg-clip-text text-transparent">MediFind PH</span></h2>
        <p className="mt-2 text-sm font-medium tracking-wide text-slate-600 sm:text-base">Your OTC Medicine Information Assistant</p>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-500 sm:text-sm">Search verified medicine details from the MediFind PH leaflet collection, with source citations you can inspect.</p>

        <div className="mt-6 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {SHORTCUTS.map(({ label, icon: Icon, color, question }) => (
            <button key={label} type="button" onClick={() => onExample(question)} className="shortcut-card group flex min-h-[82px] items-center gap-3 rounded-2xl px-3 py-3 text-left sm:px-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color} shadow-sm transition-transform group-hover:scale-105`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="text-xs font-semibold text-slate-700 sm:text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
