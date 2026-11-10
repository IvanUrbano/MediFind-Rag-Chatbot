import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Copy,
  RotateCcw,
  ScanSearch,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import Badge from '../common/Badge'
import SourceCitations from '../citations/SourceCitations'
import MedicineCard from '../medicine/MedicineCard'
import { formatTime } from '../../utils/format'

function UserBubble({ message }) {
  return (
    <div className="flex justify-end animate-fade-in-up">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md border border-white/45 bg-teal-600/85 px-4 py-2.5 text-white shadow-lg shadow-teal-900/10 backdrop-blur-md sm:max-w-[75%]">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        <p className="mt-1 text-right text-[10px] text-brand-100/80">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}

function ErrorBubble({ message, canRetry, onRetry }) {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
        aria-hidden="true"
      >
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 shadow-sm sm:max-w-[75%]">
        <p className="text-sm leading-relaxed text-red-800">{message.content}</p>
        <div className="mt-2 flex items-center gap-3">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          )}
          <span className="text-[10px] text-red-400">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

function AssistantBubble({ message, canRetry, onRetry, onFeedback }) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(message.feedback ?? null)
  const copyTimer = useRef(null)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch {
      // Clipboard unavailable (http context / older browsers): fail silently.
      return
    }
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1600)
  }

  function handleFeedback(value) {
    const next = feedback === value ? null : value
    setFeedback(next)
    onFeedback?.(next)
  }

  const medicines = Array.isArray(message.medicines)
    ? message.medicines
    : message.medicines
      ? [message.medicines]
      : []

  const statusBadge = {
    insufficient_evidence: (
      <Badge variant="warning">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Insufficient evidence
      </Badge>
    ),
    unsupported: <Badge variant="neutral">Out of scope</Badge>,
  }[message.status]

  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-emerald-600 text-[11px] font-bold text-white"
        aria-hidden="true"
      >
        MF
      </span>

      <div className="min-w-0 max-w-[92%] sm:max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md border border-white/65 bg-white/58 px-4 py-3 shadow-[0_12px_36px_rgba(51,65,85,0.09)] backdrop-blur-xl">
          {/* Meta badges */}
          {(message.demo || statusBadge) && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {message.demo && (
                <Badge variant="demo">Demo response — not verified</Badge>
              )}
              {statusBadge}
            </div>
          )}

          {/* Normalized entity chip */}
          {message.recognized && (
            <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              <ScanSearch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Recognized: {message.recognized}</span>
            </div>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {message.content}
          </p>

          {medicines.map((medicine, index) => (
            <MedicineCard
              key={medicine.id ?? index}
              medicine={medicine}
              demo={Boolean(message.demo)}
            />
          ))}

          <SourceCitations sources={message.sources} status={message.status} />

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
            <span className="mr-auto text-[10px] text-slate-400">
              {formatTime(message.timestamp)}
            </span>

            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy response'}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                copied
                  ? 'text-emerald-600'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('up')}
              aria-label="Helpful response"
              aria-pressed={feedback === 'up'}
              className={`rounded-md p-1.5 transition-colors ${
                feedback === 'up'
                  ? 'text-emerald-600'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('down')}
              aria-label="Unhelpful response"
              aria-pressed={feedback === 'down'}
              className={`rounded-md p-1.5 transition-colors ${
                feedback === 'down'
                  ? 'text-red-500'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/45 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur hover:bg-white/70"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry last request
          </button>
        )}
      </div>
    </div>
  )
}

export default function MessageBubble({ message, canRetry, onRetry, onFeedback }) {
  if (message.role === 'user') return <UserBubble message={message} />
  if (message.status === 'error') {
    return (
      <ErrorBubble message={message} canRetry={canRetry} onRetry={onRetry} />
    )
  }
  return (
    <AssistantBubble
      message={message}
      canRetry={canRetry}
      onRetry={onRetry}
      onFeedback={onFeedback}
    />
  )
}
