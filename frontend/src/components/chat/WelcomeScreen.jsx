import { ArrowRight, MessageSquareText } from 'lucide-react'
import BrandMark from '../common/BrandMark'

const SUGGESTED_QUESTIONS = [
  'What is the generic name of Biogesic 500 mg Tablet?',
  'What formulations of Biogesic are documented?',
  'What are the ingredients of Gaviscon Double Action Suspension?',
  'What precautions are documented for Allerkid?',
]

export default function WelcomeScreen({ onSelectSuggestion, onViewScope }) {
  return (
    <div className="canvas-grid scrollbar-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-10 sm:px-8 lg:py-14">
        <div className="animate-fade-in">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8 shrink-0" />
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
              MediFind PH <span className="text-brass-500">/</span> New conversation
            </p>
          </div>

          <h2 className="mt-6 max-w-xl font-serif text-[34px] font-medium leading-[1.04] tracking-[-0.02em] text-ink sm:text-[42px]">
            What would you like to know about OTC medicines?
          </h2>
          <p className="mt-3.5 max-w-xl text-[13px] leading-7 text-muted">
            Ask about medicine ingredients, formulations, documented uses, warnings, and precautions available in the MediFind PH knowledge base.
          </p>

          <section className="mt-8" aria-labelledby="suggested-questions-title">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
              <h3 id="suggested-questions-title" className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                <MessageSquareText className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                Suggested questions
              </h3>
              <span className="font-mono text-[9px] text-muted">04</span>
            </div>

            <ul>
              {SUGGESTED_QUESTIONS.map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    onClick={() => onSelectSuggestion(question)}
                    className="group flex w-full items-center gap-3 border-b border-line border-l-2 border-l-transparent py-3 pl-2 pr-1 text-left transition-colors hover:border-l-brass-400 hover:bg-paper-2/80"
                  >
                    <span className="min-w-0 flex-1 text-[13px] leading-6 text-ink">{question}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted/60 transition-all group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-6 border-l-2 border-line-strong pl-3.5">
            <p className="max-w-xl text-[11.5px] leading-6 text-muted">
              You can ask about documented OTC medicine information. MediFind PH does not provide diagnoses, prescriptions, personalized dosing, real-time prices, or pharmacy stock.
            </p>
            <button
              type="button"
              onClick={onViewScope}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-brand-700 underline decoration-line-strong decoration-dotted underline-offset-4 transition-colors hover:text-brand-900"
            >
              View Full Scope and Limitations
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
