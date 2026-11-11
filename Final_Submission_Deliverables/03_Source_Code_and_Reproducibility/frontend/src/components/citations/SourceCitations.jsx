import { useState } from 'react'
import { ChevronDown, FileText, SearchX } from 'lucide-react'

function Citation({ citation }) {
  const [expanded, setExpanded] = useState(false)
  const passage = citation.passage || ''

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <FileText className="h-3 w-3 shrink-0 translate-y-0.5 text-muted" aria-hidden="true" />
        <span className="break-all font-mono text-[10.5px] leading-5 text-ink">
          {citation.source}
        </span>
        {citation.page != null && (
          <span className="ml-auto shrink-0 border border-line px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
            p. {citation.page}
          </span>
        )}
      </div>

      {passage && (
        <div className="mt-1.5 pl-5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted underline decoration-line-strong decoration-dotted underline-offset-4 transition-colors hover:text-brand-700"
          >
            {expanded ? 'Hide passage' : 'Show supporting passage'}
          </button>
          {expanded && (
            <blockquote className="mt-2 border-l border-line pl-3 font-serif text-[13px] leading-6 text-muted">
              “{passage}”
            </blockquote>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Expandable source references under a response.
 * Renders only what the API returned - never fabricates sources.
 */
export default function SourceCitations({ sources, status }) {
  const [open, setOpen] = useState(false)

  const showEmptyNote =
    (!sources || sources.length === 0) && status === 'insufficient_evidence'

  if ((!sources || sources.length === 0) && !showEmptyNote) return null

  if (showEmptyNote) {
    return (
      <div className="mt-4 flex items-start gap-2 border-l-2 border-line-strong py-0.5 pl-3 text-[11.5px] leading-5 text-muted">
        <SearchX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          No supporting passages found in the source documents for this question.
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-2.5 text-left transition-colors hover:text-ink"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.14em] text-brand-700">
            <FileText className="h-3 w-3" aria-hidden="true" />
            Sources · {sources.length}
          </span>
          <span className="hidden truncate font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted sm:inline">
            verify against the original PDFs
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {sources.map((citation, index) => (
            <Citation
              key={`${citation.source}-${citation.page}-${index}`}
              citation={citation}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
