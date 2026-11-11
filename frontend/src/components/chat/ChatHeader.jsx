import { useEffect, useRef, useState } from 'react'
import { Check, CircleHelp, Menu, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react'
import Badge from '../common/Badge'
import { isMockMode } from '../../api/client'

export default function ChatHeader({
  title,
  subtitle,
  isMobileOpen,
  isSidebarCollapsed,
  onToggleMobile,
  onToggleCollapse,
  onClear,
  hasMessages,
  onAbout,
  showClear = true,
  showModeBadge = true,
}) {
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
    <header className="z-20 flex h-[68px] shrink-0 items-center gap-1.5 border-b border-line bg-paper px-3 sm:px-6">
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileOpen}
        className="btn btn-ghost btn-icon md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        className="btn btn-ghost btn-icon hidden md:inline-flex"
      >
        {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <div className="mx-1 min-w-0 flex-1">
        <h1 className="truncate font-serif text-[17px] font-medium leading-tight tracking-tight text-ink sm:text-[19px]">
          {title || 'MediFind PH'}
        </h1>
        <p className="mt-0.5 hidden truncate font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted sm:block">
          {subtitle || 'Grounded in Vol. I–III · PDF cited'}
        </p>
      </div>

      {showModeBadge && (
        <Badge variant={mock ? 'demo' : 'live'} className="max-sm:hidden">
          <span
            className={`h-1 w-1 ${mock ? 'bg-amber-600' : 'status-dot bg-brand-600'}`}
            aria-hidden="true"
          />
          {mock ? 'Demo data' : 'Index connected'}
        </Badge>
      )}

      <button
        type="button"
        onClick={onAbout}
        aria-label="About MediFind PH"
        className="btn btn-ghost btn-icon sm:w-auto sm:px-2.5"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] sm:inline">About</span>
      </button>

      {showClear && (
        <button
          type="button"
          onClick={handleClearClick}
          disabled={!hasMessages}
          aria-label="Clear conversation"
          className={`btn btn-ghost btn-icon sm:w-auto sm:px-2.5 ${
            confirmingClear ? 'bg-red-700 text-white hover:bg-red-800 hover:text-white' : ''
          } ${!hasMessages ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted' : ''}`}
        >
          {confirmingClear ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] sm:inline">Confirm</span>
            </>
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] sm:inline">Clear</span>
            </>
          )}
        </button>
      )}
    </header>
  )
}
