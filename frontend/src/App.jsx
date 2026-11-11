import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import BrandMark from './components/common/BrandMark'
import ChatHeader from './components/chat/ChatHeader'
import WelcomeScreen from './components/chat/WelcomeScreen'
import MessageList from './components/chat/MessageList'
import MessageInput from './components/chat/MessageInput'
import MedicineCatalog from './components/catalog/MedicineCatalog'
import HomePage from './components/home/HomePage'
import Disclaimer from './components/common/Disclaimer'
import { useConversations } from './hooks/useConversations'
import { useChat } from './hooks/useChat'

export default function App() {
  const conversationsApi = useConversations()
  const {
    conversations,
    activeId,
    activeConversation,
    startNewChat,
    selectConversation,
    renameConversation,
    deleteConversation,
    clearConversation,
    appendMessage,
    patchMessage,
    ensureConversation,
  } = conversationsApi

  const { send, retry, isSending, retryState } = useChat({
    ensureConversation,
    appendMessage,
    patchMessage,
  })

  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [draft, setDraft] = useState('')
  const [homeScrollTarget, setHomeScrollTarget] = useState(null)

  const messages = activeConversation?.messages ?? []
  const hasMessages = messages.length > 0

  // Close the mobile drawer on window resize to desktop widths.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    function onChange(event) {
      if (event.matches) setMobileOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  useEffect(() => {
    if (!aboutOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setAboutOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aboutOpen])

  useEffect(() => {
    if (activeView !== 'home' || !homeScrollTarget) return undefined
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(homeScrollTarget)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setHomeScrollTarget(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [activeView, homeScrollTarget])

  const focusChatInput = useCallback(() => {
    requestAnimationFrame(() => {
      document.querySelector('[data-chat-input]')?.focus()
    })
  }, [])

  const handleHome = useCallback(() => {
    setActiveView('home')
    setMobileOpen(false)
  }, [])

  const handleAsk = useCallback(() => {
    setActiveView('chat')
    setMobileOpen(false)
    focusChatInput()
  }, [focusChatInput])

  const handleNewChat = useCallback(() => {
    startNewChat()
    setDraft('')
    setActiveView('chat')
    setMobileOpen(false)
    focusChatInput()
  }, [startNewChat, focusChatInput])

  const handleSelect = useCallback(
    (id) => {
      selectConversation(id)
      setDraft('')
      setActiveView('chat')
      setMobileOpen(false)
    },
    [selectConversation],
  )

  const handleDelete = useCallback(
    (id) => {
      deleteConversation(id)
    },
    [deleteConversation],
  )

  const handleSuggestion = useCallback(
    (question) => {
      setDraft(question)
      setActiveView('chat')
      focusChatInput()
    },
    [focusChatInput],
  )

  const handleSend = useCallback(
    (text) => {
      setDraft('')
      send(text)
    },
    [send],
  )

  const handleViewScope = useCallback(() => {
    setActiveView('home')
    setHomeScrollTarget('scope-limitations')
    setMobileOpen(false)
  }, [])

  const handleFeedback = useCallback(
    (messageId, value) => {
      if (!activeId) return
      patchMessage(activeId, messageId, { feedback: value })
    },
    [activeId, patchMessage],
  )

  const handleBrowse = useCallback(() => {
    setMobileOpen(false)
    setActiveView('catalog')
  }, [])

  const handleAskMedicine = useCallback(
    (medicine) => {
      setActiveView('chat')
      const registration = medicine.registrationNumber
        ? ` (FDA Reg. No. ${medicine.registrationNumber})`
        : ''
      requestAnimationFrame(() => {
        send(`Tell me about ${medicine.brand}${registration}.`, {
          medicineContext: medicine,
        })
      })
    },
    [send],
  )

  const handleClear = useCallback(() => {
    if (activeId) clearConversation(activeId)
  }, [activeId, clearConversation])

  const sidebarProps = {
    conversations,
    activeId,
    searchQuery,
    onSearchChange: setSearchQuery,
    onNewChat: handleNewChat,
    onSelect: handleSelect,
    onRename: renameConversation,
    onDelete: handleDelete,
    onHome: handleHome,
    onFocusChat: handleAsk,
    onBrowse: handleBrowse,
    activeView,
  }

  return (
    <div className="app-shell flex h-dvh overflow-hidden text-ink">
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-[#1d2821]/45 transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar: drawer on mobile, panel on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:hidden' : ''}`}
      >
        <Sidebar {...sidebarProps} className="h-full" />
      </div>

      {/* Chat column */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={
            activeView === 'home'
              ? 'Home'
              : activeView === 'catalog'
                ? 'Browse Medicines'
                : activeConversation?.title ?? 'New conversation'
          }
          subtitle={
            activeView === 'home'
              ? 'Learn about MediFind PH · OTC medicine reference'
              : activeView === 'catalog'
                ? 'Documented OTC records · 3 source volumes'
                : 'Grounded in Vol. I–III · PDF cited'
          }
          isMobileOpen={mobileOpen}
          isSidebarCollapsed={collapsed}
          onToggleMobile={() => setMobileOpen((v) => !v)}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onClear={handleClear}
          hasMessages={activeView === 'chat' && hasMessages}
          showClear={activeView === 'chat'}
          showModeBadge={activeView !== 'home'}
          onAbout={() => setAboutOpen(true)}
        />

        {activeView === 'home' ? (
          <HomePage onAsk={handleAsk} />
        ) : activeView === 'catalog' ? (
          <MedicineCatalog onAskAI={handleAskMedicine} />
        ) : (
          <>
            {hasMessages ? (
              <MessageList messages={messages} isSending={isSending} retryMessageId={retryState?.messageId ?? null} onRetry={retry} onFeedback={handleFeedback} />
            ) : (
              <WelcomeScreen onSelectSuggestion={handleSuggestion} onViewScope={handleViewScope} />
            )}
            <MessageInput value={draft} onChange={setDraft} onSend={handleSend} disabled={isSending} />
            <p className="shrink-0 px-4 pb-3 text-center text-[11px] leading-relaxed text-muted">MediFind PH provides general OTC medicine information and does not replace professional medical advice.</p>
          </>
        )}
      </main>

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b2620]/55 p-4" role="presentation" onMouseDown={() => setAboutOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="about-title" className="panel relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-[12px]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="h-[2px] bg-brass-400/80" aria-hidden="true" />
            <button type="button" onClick={() => setAboutOpen(false)} aria-label="Close About" className="btn btn-ghost btn-icon absolute right-4 top-5 h-8 w-8"><X className="h-4 w-4" /></button>
            <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <div className="flex items-center gap-3">
                <BrandMark className="h-11 w-11 shrink-0" />
                <div>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted">About the reference</p>
                  <h2 id="about-title" className="mt-1 font-serif text-[24px] font-medium leading-none text-ink">MediFind PH</h2>
                </div>
              </div>
              <p className="mt-5 text-[12.5px] leading-7 text-muted">MediFind PH is a reference assistant for Philippine OTC medicine information. It answers only from the three supplied MediFind leaflet volumes and cites the source PDF and page whenever evidence is available.</p>

              <div className="mt-5 grid grid-cols-3 divide-x divide-line border border-line text-center">
                <div className="px-2 py-3">
                  <span className="block font-serif text-[18px] leading-none text-ink">3</span>
                  <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted">Volumes</span>
                </div>
                <div className="px-2 py-3">
                  <span className="block font-serif text-[18px] leading-none text-ink">PDF</span>
                  <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted">Citations</span>
                </div>
                <div className="px-2 py-3">
                  <span className="block font-serif text-[18px] leading-none text-ink">OTC</span>
                  <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted">Scope</span>
                </div>
              </div>

              <div className="mt-5">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted">Source volumes</p>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {[
                    ['I', 'Pain · Fever · Muscle'],
                    ['II', 'Cold · Cough · Allergy · Throat'],
                    ['III', 'Digestive · Antiseptic · Eye'],
                  ].map(([numeral, name]) => (
                    <li key={numeral} className="flex items-center gap-3 py-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-line font-serif text-[10px] text-brass-600">{numeral}</span>
                      <span className="text-[12px] text-ink">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5"><Disclaimer /></div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
