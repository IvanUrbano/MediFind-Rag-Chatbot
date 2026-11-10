import { useState } from 'react'
import { Bot, HeartPulse, Home, Library, Plus, Search } from 'lucide-react'
import ConversationList from './ConversationList'
import AboutSection from './AboutSection'

export default function Sidebar({
  conversations, activeId, searchQuery, onSearchChange, onNewChat, onSelect,
  onRename, onDelete, onHome, onFocusChat, onBrowse, activeView, className = '',
}) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const navItems = [
    { label: 'Home', icon: Home, action: onHome },
    { label: 'AI Medicine Chat', icon: Bot, action: onFocusChat, active: activeView === 'chat' },
    { label: 'Browse Medicines', icon: Library, action: onBrowse, active: activeView === 'catalog' },
  ]

  return (
    <aside className={`sidebar-glass flex h-full w-[88vw] max-w-xs flex-col md:w-[292px] md:max-w-none ${className}`}>
      <div className="flex items-center gap-2 px-4 pb-3 pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-600/20 ring-1 ring-white/60" aria-hidden="true"><HeartPulse className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold leading-tight text-slate-900">MediFind PH</span>
            <span className="block truncate text-[11px] font-medium text-teal-700">OTC Medicine Assistant</span>
          </span>
        </div>
      </div>

      <div className="px-3 pb-3">
        <button type="button" onClick={onNewChat} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-700/15 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"><Plus className="h-4 w-4" aria-hidden="true" />New Chat</button>
      </div>

      <nav className="space-y-1 px-3 pb-3" aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon, action, active }) => (
          <button key={label} type="button" onClick={action} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? 'bg-teal-600/12 text-teal-800 shadow-sm ring-1 ring-white/40' : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'}`}>
            <Icon className={`h-4 w-4 ${active ? 'text-teal-600' : 'text-slate-500'}`} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search conversations…" className="w-full rounded-xl border border-white/50 bg-white/35 py-2.5 pl-8 pr-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-500 transition-colors focus:border-teal-400 focus:bg-white/60 focus:outline-none" />
        </label>
      </div>

      <nav className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Conversation history">
        <ConversationList conversations={conversations} activeId={activeId} searchQuery={searchQuery} onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
      </nav>

      <AboutSection open={aboutOpen} onToggle={() => setAboutOpen((value) => !value)} />
    </aside>
  )
}
