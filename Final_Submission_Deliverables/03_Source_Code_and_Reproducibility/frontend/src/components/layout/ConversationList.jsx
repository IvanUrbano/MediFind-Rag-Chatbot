import { useMemo, useState } from 'react'
import { Check, MessageSquare, Pencil, Trash2, X } from 'lucide-react'
import { dayGroup } from '../../utils/format'

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(conversation.title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function startRename() {
    setDraft(conversation.title)
    setRenaming(true)
  }

  function commitRename() {
    const clean = draft.trim()
    if (clean && clean !== conversation.title) onRename(clean)
    setRenaming(false)
  }

  function cancelRename() {
    setDraft(conversation.title)
    setRenaming(false)
  }

  function handleRenameKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  if (renaming) {
    return (
      <li className="flex items-center gap-1 border-l-2 border-[#c3b183] bg-[#26312a] px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={commitRename}
          maxLength={80}
          aria-label="Conversation title"
          className="min-w-0 flex-1 border border-[#4a5a4e] bg-[#1a231d] px-2 py-1 text-sm text-[#ece8dc] focus:border-[#c3b183] focus:outline-none"
        />
        <button
          type="button"
          onClick={commitRename}
          aria-label="Save title"
          className="p-1.5 text-[#c3b183] hover:bg-[#303d33]"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={cancelRename}
          aria-label="Cancel rename"
          className="p-1.5 text-[#8d9a8f] hover:bg-[#303d33]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </li>
    )
  }

  if (confirmingDelete) {
    return (
      <li className="flex items-center justify-between gap-2 border-l-2 border-[#b4544a] bg-[#3a2624] px-3 py-2 text-sm">
        <span className="text-[#e7c3bc]">Delete this chat?</span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => onDelete()}
            className="bg-[#a94f46] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#b85b51]"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="px-2 py-1 text-[11px] font-medium text-[#d3bdb8] hover:bg-[#4a302d]"
          >
            Cancel
          </button>
        </span>
      </li>
    )
  }

  return (
    <li>
      <div
        className={`group flex items-center gap-1 border-l-2 px-2 py-1.5 transition-colors ${
          isActive
            ? 'border-[#c3b183] bg-[#2a372e] text-[#f2eee1]'
            : 'border-transparent text-[#aeb8ae] hover:bg-[#243027] hover:text-[#f2eee1]'
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={conversation.title}
        >
          <MessageSquare
            className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#c3b183]' : 'text-[#6f7c71]'}`}
            aria-hidden="true"
          />
          <span className="truncate text-[13px]">{conversation.title}</span>
        </button>

        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            type="button"
            onClick={startRename}
            aria-label={`Rename ${conversation.title}`}
            className="p-1 text-[#77857a] hover:bg-[#303d33] hover:text-[#f2eee1]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${conversation.title}`}
            className="p-1 text-[#77857a] hover:bg-[#303d33] hover:text-[#e7c3bc]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>

        {/* Touch devices: keep actions always visible */}
        <span className="flex shrink-0 items-center gap-0.5 group-hover:hidden md:hidden">
          <button
            type="button"
            onClick={startRename}
            aria-label={`Rename ${conversation.title}`}
            className="p-1 text-[#77857a]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${conversation.title}`}
            className="p-1 text-[#77857a]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    </li>
  )
}

export default function ConversationList({
  conversations,
  activeId,
  searchQuery,
  onSelect,
  onRename,
  onDelete,
}) {
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(query))
  }, [conversations, searchQuery])

  const groups = useMemo(() => {
    const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
    const map = new Map(order.map((label) => [label, []]))
    for (const c of filtered) {
      map.get(dayGroup(c.updatedAt ?? c.createdAt))?.push(c)
    }
    return order
      .map((label) => ({ label, items: map.get(label) ?? [] }))
      .filter((g) => g.items.length > 0)
  }, [filtered])

  if (conversations.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-[#7f8b80]">
        No conversations yet.
      </p>
    )
  }

  if (filtered.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-[#7f8b80]">
        No chats match “{searchQuery.trim()}”.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-1.5 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#758074]">
            {group.label}
          </h3>
          <ul className="space-y-0.5">
            {group.items.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
                onSelect={() => onSelect(conversation.id)}
                onRename={(title) => onRename(conversation.id, title)}
                onDelete={() => onDelete(conversation.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
