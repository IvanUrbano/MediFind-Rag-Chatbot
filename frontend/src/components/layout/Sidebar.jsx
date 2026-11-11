import { useState } from 'react'
import { Home, Library, MessageSquareText, Plus, Search } from 'lucide-react'
import BrandMark from '../common/BrandMark'
import ConversationList from './ConversationList'
import AboutSection from './AboutSection'

export default function Sidebar({
  conversations, activeId, searchQuery, onSearchChange, onNewChat, onSelect,
  onRename, onDelete, onHome, onFocusChat, onBrowse, activeView, className = '',
}) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const navItems = [
    { label: 'Home', icon: Home, action: onHome, active: activeView === 'home' },
    { label: 'Ask a question', icon: MessageSquareText, action: onFocusChat, active: activeView === 'chat' },
    { label: 'Browse medicines', icon: Library, action: onBrowse, active: activeView === 'catalog' },
  ]

  return (
    <aside className={`sidebar-ink flex h-full w-[88vw] max-w-[316px] flex-col md:w-[312px] md:max-w-none ${className}`}>
      <div className="h-[2px] shrink-0 bg-brass-400/70" aria-hidden="true" />

      <div className="flex items-center gap-3 border-b border-[#2b382f] px-4 pb-4 pt-5">
        <BrandMark className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <span className="block truncate font-serif text-[19px] font-medium leading-none tracking-tight text-[#f5f1e4]">
            MediFind <span className="text-brass-300">PH</span>
          </span>
          <span className="mt-1.5 block truncate font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#879386]">
            OTC medicine reference
          </span>
        </div>
      </div>

      <div className="px-3 pb-3 pt-4">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brass-500 bg-brass-400 px-3 py-2.5 text-[12px] font-medium text-[#1c241e] transition-colors hover:bg-brass-300"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New chat
        </button>
      </div>

      <nav className="px-3 pb-3" aria-label="Primary navigation">
        <p className="mb-1.5 px-2.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#6f7c72]">Workspace</p>
        <ul className="space-y-0.5">
          {navItems.map(({ label, icon: Icon, action, active }) => (
            <li key={label}>
              <button
                type="button"
                onClick={action}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-r-md border-l-2 px-2.5 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? 'border-brass-400 bg-[#29372e] text-[#f5f1e4]'
                    : 'border-transparent text-[#aeb8ae] hover:bg-[#243027] hover:text-[#f2eee1]'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-brass-300' : 'text-[#6f7c71]'}`} aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-3 pb-3">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6f7c72]" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations"
            className="sidebar-field w-full py-2 pl-8 pr-3 text-[12px]"
          />
        </label>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#6f7c72]">History</span>
        <span className="font-mono text-[8.5px] text-[#6f7c72]">{String(conversations.length).padStart(2, '0')}</span>
      </div>

      <nav className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Conversation history">
        <ConversationList conversations={conversations} activeId={activeId} searchQuery={searchQuery} onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
      </nav>

      <div className="mx-4 mb-3 flex items-center gap-2 border-t border-[#2b382f] pt-3 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#7d897e]">
        <span className="status-dot h-1 w-1 bg-[#83aa8d]" aria-hidden="true" />
        3 volumes indexed
      </div>

      <AboutSection open={aboutOpen} onToggle={() => setAboutOpen((value) => !value)} />
    </aside>
  )
}
