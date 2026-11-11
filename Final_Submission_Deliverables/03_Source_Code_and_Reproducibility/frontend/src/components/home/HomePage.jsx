import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  GitCompareArrows,
  MessageSquareText,
  Pill,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import BrandMark from '../common/BrandMark'

const FEATURES = [
  {
    icon: Pill,
    title: 'Medicine information',
    description:
      'Structured records for documented OTC products, including strengths, dosage forms, and FDA registration details.',
  },
  {
    icon: FileText,
    title: 'Documented uses and precautions',
    description:
      'Indications and precautions are reported as written in the available source documents, never invented.',
  },
  {
    icon: GitCompareArrows,
    title: 'Medicine and formulation comparisons',
    description:
      'Compare records and keep different formulations separate, even when they share the same brand name.',
  },
  {
    icon: BookOpen,
    title: 'PDF-based citations',
    description:
      'Grounded answers cite the source PDF and page so every claim can be checked against the original document.',
  },
]

const STEPS = [
  'Ask a medicine-related question.',
  'Retrieve information from the PDF knowledge base.',
  'Read the answer and supporting references.',
]

const VOLUMES = [
  { numeral: 'I', name: 'Pain, Fever & Muscle' },
  { numeral: 'II', name: 'Cold, Cough, Allergy & Throat' },
  { numeral: 'III', name: 'Digestive, Antiseptic & Eye' },
]

const IN_SCOPE = [
  'Brand and generic names',
  'Active ingredients and strengths',
  'Dosage forms and formulations',
  'FDA registration details',
  'Documented indications',
  'Warnings and precautions',
  'Medicine comparisons',
  'PDF source references',
]

const OUT_OF_SCOPE = [
  'Medical diagnoses',
  'Prescriptions',
  'Personalized dosing',
  'Individual treatment plans',
  'Real-time medicine prices',
  'Pharmacy inventory',
  'Live FDA database updates',
  'Medicines not included in the knowledge base',
]

export default function HomePage({ onAsk }) {
  return (
    <div className="home-canvas scrollbar-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">
        <section className="home-glass relative overflow-hidden rounded-[16px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10" aria-labelledby="home-welcome-title">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-brass-200/50 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12">
            <div>
              <div className="flex items-center gap-2.5">
                <BrandMark className="h-9 w-9 shrink-0" />
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                  MediFind PH <span className="text-brass-500">/</span> OTC medicine reference
                </p>
              </div>

              <h2 id="home-welcome-title" className="mt-7 max-w-2xl font-serif text-[42px] font-medium leading-[0.98] tracking-[-0.025em] text-ink sm:text-[56px]">
                Welcome to <em className="whitespace-nowrap text-brand-700">MediFind PH</em>
              </h2>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-muted sm:text-[15px]">
                Your guide to documented OTC medicine information in the Philippines.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onAsk}
                  className="btn btn-primary h-10 px-4"
                >
                  <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                  Ask a Question
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                  94 records · 3 PDF volumes
                </span>
              </div>
            </div>

            <aside className="rounded-[12px] border border-line bg-paper-2/75 p-4 backdrop-blur-sm sm:p-5">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.15em] text-muted">
                Reference at a glance
              </p>
              <dl className="mt-3 grid grid-cols-2 divide-x divide-line border-y border-line">
                <div className="py-3 pr-4">
                  <dd className="font-serif text-[28px] font-medium leading-none text-ink">94</dd>
                  <dt className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                    Product entries
                  </dt>
                </div>
                <div className="py-3 pl-4">
                  <dd className="font-serif text-[28px] font-medium leading-none text-ink">03</dd>
                  <dt className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                    PDF volumes
                  </dt>
                </div>
              </dl>
              <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-muted">
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden="true" />
                <p>Retrieved from the indexed leaflets and cited at page level.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-10 sm:mt-12" aria-labelledby="features-title">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-brand-700">What you can do</p>
              <h2 id="features-title" className="mt-1.5 font-serif text-[28px] font-medium leading-tight text-ink">
                Features
              </h2>
            </div>
            <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted sm:block">
              Grounded in source documents
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <article key={title} className="home-glass rounded-[10px] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-paper-2 text-brand-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-medium leading-5 text-ink">{title}</h3>
                    <p className="mt-1 text-[12px] leading-6 text-muted">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 sm:mt-12" aria-labelledby="how-it-works-title">
          <div className="border-b border-line pb-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-brand-700">The workflow</p>
            <h2 id="how-it-works-title" className="mt-1.5 font-serif text-[28px] font-medium leading-tight text-ink">
              How It Works
            </h2>
          </div>

          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step} className="home-glass flex gap-4 rounded-[10px] p-4 sm:p-5">
                <span className="font-serif text-[24px] leading-none text-brass-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-muted">
                    Step {index + 1}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-ink">{step}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 sm:mt-12" aria-labelledby="knowledge-base-title">
          <div className="border-b border-line pb-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-brand-700">The source library</p>
            <h2 id="knowledge-base-title" className="mt-1.5 font-serif text-[28px] font-medium leading-tight text-ink">
              Knowledge Base
            </h2>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="home-glass rounded-[10px] p-5">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <p className="font-serif text-[34px] font-medium leading-none text-ink">94</p>
                  <p className="mt-2 text-[12.5px] leading-6 text-muted">
                    medicine product entries across three curated PDF volumes.
                  </p>
                </div>
              </div>
              <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-6 text-muted">
                Some records contain official patient information leaflets, while others contain registration information only.
              </p>
            </div>

            <ul className="home-glass divide-y divide-line overflow-hidden rounded-[10px]">
              {VOLUMES.map((volume) => (
                <li key={volume.numeral} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-paper-2 font-serif text-[13px] text-brass-600">
                    {volume.numeral}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-muted">
                      Volume {volume.numeral}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink">{volume.name}</p>
                  </div>
                  <FileText className="ml-auto h-4 w-4 shrink-0 text-muted/60" aria-hidden="true" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="scope-limitations" className="mt-10 scroll-mt-6 sm:mt-12" aria-labelledby="scope-title">
          <div className="border-b border-line pb-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-brand-700">Read this first</p>
            <h2 id="scope-title" className="mt-1.5 font-serif text-[28px] font-medium leading-tight text-ink">
              Scope and Limitations
            </h2>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="home-glass rounded-[10px] p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
                <h3 className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-brand-700">
                  Within Scope
                </h3>
              </div>
              <ul className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {IN_SCOPE.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12px] leading-5 text-ink">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="home-glass rounded-[10px] p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <X className="h-4 w-4 text-brass-600" aria-hidden="true" />
                <h3 className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-brass-700">
                  Outside Scope
                </h3>
              </div>
              <ul className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {OUT_OF_SCOPE.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12px] leading-5 text-muted">
                    <X className="mt-0.5 h-3 w-3 shrink-0 text-brass-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="home-glass mt-10 rounded-[10px] border-l-2 border-l-brass-400 p-5 sm:mt-12 sm:p-6" aria-labelledby="home-disclaimer-title">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <h2 id="home-disclaimer-title" className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-brand-700">
                Medical Disclaimer
              </h2>
              <p className="mt-2 text-[12.5px] leading-6 text-ink">
                MediFind PH is intended for educational and informational purposes and is not a substitute for professional medical advice.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
