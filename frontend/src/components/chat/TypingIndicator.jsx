import { LoaderCircle } from 'lucide-react'
import BrandMark from '../common/BrandMark'

export default function TypingIndicator() {
  return (
    <div className="animate-fade-in border-t border-line pt-4">
      <div className="mb-2.5 flex items-center gap-2">
        <BrandMark className="h-[17px] w-[17px] shrink-0" />
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-brand-700">
          MediFind PH
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2 text-[12.5px] italic text-muted">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />
        Reading source documents…
      </div>
      <div className="mt-3 h-px w-full overflow-hidden bg-line" aria-hidden="true">
        <div className="h-px w-1/4 bg-brass-400 animate-[scan_1.8s_ease-in-out_infinite]" />
      </div>
      <span className="sr-only" role="status">
        MediFind PH is searching the source documents
      </span>
    </div>
  )
}
