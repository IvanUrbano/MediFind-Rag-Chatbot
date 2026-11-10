import { useState } from 'react'
import { ChevronDown, FileText, SearchX } from 'lucide-react'

function Citation({ citation }) {
  const [expanded, setExpanded] = useState(false)
  const passage = citation.passage || ''

  return (
    <li className="rounded-lg border border-white/60 bg-white/35 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <FileText className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
        <span className="break-all text-xs font-semibold text-slate-700">
          {citation.source}
        </span>
        {citation.page != null && (
          <span className="shrink-0 rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
            Page {citation.page}
          </span>
        )}
      </div>

      {passage && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="text-left text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            {expanded ? 'Hide passage' : 'Show supporting passage'}
          </button>
          {expanded && (
            <blockquote className="mt-1.5 border-l-2 border-brand-300 pl-2.5 text-xs leading-relaxed text-slate-600">
              “{passage}”
            </blockquote>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Expandable source references under an AI response.
 * Renders only what the API returned - never fabricates sources.
 */
export default function SourceCitations({ sources, status }) {
  const [open, setOpen] = useState(false)

  const showEmptyNote =
    (!sources || sources.length === 0) && status === 'insufficient_evidence'

  if ((!sources || sources.length === 0) && !showEmptyNote) return null

  if (showEmptyNote) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        <SearchX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          No supporting passages found in the source documents for this question.
        </span>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-white/65 bg-white/40 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <FileText className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          Sources ({sources.length})
          <span className="font-normal text-slate-400">
            — verify against the original PDFs
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="space-y-2 border-t border-slate-100 px-3 py-3">
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
