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
import BrandMark from '../common/BrandMark'
import SourceCitations from '../citations/SourceCitations'
import MedicineCard from '../medicine/MedicineCard'
import { formatTime } from '../../utils/format'

function UserBubble({ message }) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[85%] rounded-lg border border-brand-800 bg-brand-900 px-4 py-3 text-[#f2eee1] sm:max-w-[75%]">
        <p className="whitespace-pre-wrap text-[13.5px] leading-6">
          {message.content}
        </p>
        <p className="mt-1.5 text-right font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#93a096]">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}

function ErrorBubble({ message, canRetry, onRetry }) {
  return (
    <div className="animate-fade-in rounded-r-md border-l-2 border-red-700 bg-red-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
        <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-red-800">
          Request failed
        </span>
        <span className="ml-auto font-mono text-[8.5px] text-red-500">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-6 text-red-900">{message.content}</p>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-mono mt-2.5 h-8 border-red-300 bg-red-100 text-red-800 hover:border-red-400 hover:bg-red-200"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Try again
        </button>
      )}
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
    <div className="animate-fade-in border-t border-line pt-4">
      <div className="mb-2.5 flex items-center gap-2">
        <BrandMark className="h-[17px] w-[17px] shrink-0" />
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-brand-700">
          MediFind PH
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {(message.demo || statusBadge) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {message.demo && (
            <Badge variant="demo">Demo response — not verified</Badge>
          )}
          {statusBadge}
        </div>
      )}

      {message.recognized && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted">
          <ScanSearch className="h-3 w-3 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="truncate">
            Interpreted as <span className="text-ink">{message.recognized}</span>
          </span>
        </div>
      )}

      <p className="whitespace-pre-wrap text-[14.5px] leading-7 text-ink">
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

      <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy response'}
          className={`btn btn-ghost btn-mono h-7 px-2 ${copied ? 'text-brand-700' : ''}`}
        >
          {copied ? (
            <Check className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>

        <button
          type="button"
          onClick={() => handleFeedback('up')}
          aria-label="Helpful response"
          aria-pressed={feedback === 'up'}
          className={`btn btn-ghost btn-icon ml-auto h-7 w-7 ${feedback === 'up' ? 'text-brand-700' : ''}`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleFeedback('down')}
          aria-label="Unhelpful response"
          aria-pressed={feedback === 'down'}
          className={`btn btn-ghost btn-icon h-7 w-7 ${feedback === 'down' ? 'text-red-700' : ''}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary btn-mono mt-3 h-8"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Retry last request
        </button>
      )}
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
