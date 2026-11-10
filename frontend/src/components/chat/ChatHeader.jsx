import { useEffect, useRef, useState } from 'react'
import { Check, CircleHelp, Menu, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react'
import Badge from '../common/Badge'
import { isMockMode } from '../../api/client'

export default function ChatHeader({ title, isMobileOpen, isSidebarCollapsed, onToggleMobile, onToggleCollapse, onClear, hasMessages, onAbout, showClear = true, showModeBadge = true }) {
  const [confirmingClear, setConfirmingClear] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleClearClick() {
    if (!hasMessages) return
    if (confirmingClear) {
      setConfirmingClear(false)
      onClear()
      return
    }
    setConfirmingClear(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setConfirmingClear(false), 3000)
  }

  const mock = isMockMode()

  return (
    <header className="header-glass z-20 mx-2 mt-2 flex h-14 shrink-0 items-center gap-2 rounded-2xl px-3 sm:mx-4 sm:px-4">
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileOpen}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        className="hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:block"
      >
        {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
          {title || 'MediFind PH'}
        </h1>
      </div>

      {showModeBadge && <Badge variant={mock ? 'demo' : 'live'}>
        <span
          className={`h-1.5 w-1.5 rounded-full ${mock ? 'bg-amber-500' : 'bg-emerald-500'}`}
          aria-hidden="true"
        />
        {mock ? 'Demo mode' : 'Live RAG'}
      </Badge>}

      <button type="button" onClick={onAbout} aria-label="About MediFind PH" className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white/45 hover:text-slate-800 sm:px-2.5">
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">About</span>
      </button>

      {showClear && <button
        type="button"
        onClick={handleClearClick}
        disabled={!hasMessages}
        aria-label="Clear conversation"
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
          confirmingClear
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        } ${!hasMessages ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-500' : ''}`}
      >
        {confirmingClear ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Confirm clear
          </>
        ) : (
          <>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear</span>
          </>
        )}
      </button>}
    </header>
  )
}
