import { useCallback, useEffect, useState } from 'react'
import { HeartPulse, X } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import ChatHeader from './components/chat/ChatHeader'
import WelcomeScreen from './components/chat/WelcomeScreen'
import MessageList from './components/chat/MessageList'
import MessageInput from './components/chat/MessageInput'
import MedicineCatalog from './components/catalog/MedicineCatalog'
import Disclaimer from './components/common/Disclaimer'
import { useConversations } from './hooks/useConversations'
import { useChat } from './hooks/useChat'

export default function App() {
  const conversationsApi = useConversations()
  const {
    conversations,
    activeId,
    activeConversation,
    newConversation,
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
  const [activeView, setActiveView] = useState('chat')

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

  const handleNewChat = useCallback(() => {
    newConversation()
    setActiveView('chat')
    setMobileOpen(false)
  }, [newConversation])

  const handleSelect = useCallback(
    (id) => {
      selectConversation(id)
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

  const handleExample = useCallback(
    (question) => {
      send(question)
    },
    [send],
  )

  const handleFeedback = useCallback(
    (messageId, value) => {
      if (!activeId) return
      patchMessage(activeId, messageId, { feedback: value })
    },
    [activeId, patchMessage],
  )

  const focusComposer = useCallback(() => {
    setActiveView('chat')
    setMobileOpen(false)
    requestAnimationFrame(() => {
      document.querySelector('[data-chat-input]')?.focus()
    })
  }, [])

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
    onHome: handleNewChat,
    onFocusChat: focusComposer,
    onBrowse: handleBrowse,
    activeView,
  }

  return (
    <div className="app-shell flex h-dvh overflow-hidden text-slate-800">
      <div className="ambient-orb ambient-orb-one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-two" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-three" aria-hidden="true" />
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
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
          title={activeView === 'catalog' ? 'Browse Medicines' : activeConversation?.title ?? 'MediFind PH'}
          isMobileOpen={mobileOpen}
          isSidebarCollapsed={collapsed}
          onToggleMobile={() => setMobileOpen((v) => !v)}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onClear={handleClear}
          hasMessages={activeView === 'chat' && hasMessages}
          showClear={activeView === 'chat'}
          showModeBadge={activeView === 'chat'}
          onAbout={() => setAboutOpen(true)}
        />

        {activeView === 'catalog' ? (
          <MedicineCatalog onAskAI={handleAskMedicine} />
        ) : (
          <>
            {hasMessages ? (
              <MessageList messages={messages} isSending={isSending} retryMessageId={retryState?.messageId ?? null} onRetry={retry} onFeedback={handleFeedback} />
            ) : (
              <WelcomeScreen onExample={handleExample} />
            )}
            <MessageInput onSend={send} disabled={isSending} showSuggestions={!hasMessages} />
            <p className="shrink-0 px-4 pb-3 text-center text-[11px] leading-relaxed text-slate-500/80">MediFind PH provides general OTC medicine information and does not replace professional medical advice.</p>
          </>
        )}
      </main>

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setAboutOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="about-title" className="glass-panel relative w-full max-w-lg rounded-[28px] p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setAboutOpen(false)} aria-label="Close About" className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-white/60 hover:text-slate-800"><X className="h-5 w-5" /></button>
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><HeartPulse className="h-5 w-5" /></span>
            <h2 id="about-title" className="text-xl font-bold text-slate-900">About MediFind PH</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">MediFind PH is a retrieval-augmented assistant for Philippine OTC medicine information. It answers only from the three supplied MediFind leaflet volumes and cites the source PDF and page whenever evidence is available.</p>
            <div className="mt-5"><Disclaimer /></div>
          </section>
        </div>
      )}
    </div>
  )
}
