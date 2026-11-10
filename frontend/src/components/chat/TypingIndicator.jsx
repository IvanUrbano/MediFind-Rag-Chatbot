export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-emerald-600 text-[11px] font-bold text-white"
        aria-hidden="true"
      >
        MF
      </span>
      <div className="rounded-2xl rounded-tl-md border border-white/65 bg-white/58 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1" aria-hidden="true">
            <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-brand-500 [animation-delay:0ms]" />
            <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-brand-500 [animation-delay:150ms]" />
            <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-brand-500 [animation-delay:300ms]" />
          </span>
          <span className="text-xs font-medium text-slate-500">
            Searching source documents…
          </span>
        </div>
      </div>
      <span className="sr-only" role="status">
        MediFind PH is searching the source documents
      </span>
    </div>
  )
}
