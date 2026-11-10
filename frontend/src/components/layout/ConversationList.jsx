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
      <li className="group flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={commitRename}
          maxLength={80}
          aria-label="Conversation title"
          className="min-w-0 flex-1 rounded-md border border-brand-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={commitRename}
          aria-label="Save title"
          className="rounded-md p-1.5 text-brand-700 hover:bg-brand-100"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={cancelRename}
          aria-label="Cancel rename"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </li>
    )
  }

  if (confirmingDelete) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm">
        <span className="text-red-700">Delete this chat?</span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => onDelete()}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
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
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-800'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={conversation.title}
        >
          <MessageSquare
            className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`}
            aria-hidden="true"
          />
          <span className="truncate text-sm">{conversation.title}</span>
        </button>

        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            type="button"
            onClick={startRename}
            aria-label={`Rename ${conversation.title}`}
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-brand-700 hover:shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${conversation.title}`}
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-sm"
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
            className="rounded p-1 text-slate-400"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${conversation.title}`}
            className="rounded p-1 text-slate-400"
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
      <p className="px-4 py-6 text-center text-sm text-slate-400">
        No conversations yet.
      </p>
    )
  }

  if (filtered.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-slate-400">
        No chats match “{searchQuery.trim()}”.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
