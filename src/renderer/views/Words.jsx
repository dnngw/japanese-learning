import { useEffect, useState } from 'react'
import { ui } from '../components/ui.js'
import { formatDue, formatTimestamp } from '../lib/format.js'
import { useRemoveWord, useSetWordStatus, useUpdateWord, useWordCounts, useWords } from '../queries/words.js'

const PAGE = 50
const TABS = [
  { id: 'learning', label: 'Learning' },
  { id: 'known', label: 'Known' },
  { id: 'ignored', label: 'Ignored' },
  { id: null, label: 'All' },
]

export default function Words() {
  const [status, setStatus] = useState('learning')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const counts = useWordCounts().data

  // Debounce typing so each keystroke doesn't hit the database.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query)
      setPage(0)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const words = useWords({ status, search, limit: PAGE, offset: page * PAGE })
  const total = words.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className={ui.page}>
      <h1 className={ui.h1}>Words</h1>
      <p className={ui.sub}>Forms like 食べた and 食べます are saved once, as 食べる, with every sentence you found them in.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line p-0.5 text-sm" role="tablist">
          {TABS.map((t) => {
            const n = t.id ? counts?.[t.id] : counts && counts.learning + counts.known + counts.ignored
            return (
              <button
                key={t.label}
                role="tab"
                aria-selected={status === t.id}
                onClick={() => {
                  setStatus(t.id)
                  setPage(0)
                }}
                className={`rounded-md px-3 py-1 ${status === t.id ? 'bg-accent-soft font-medium text-accent' : 'text-muted'}`}
              >
                {t.label} {n != null && <span className="tabular-nums opacity-70">{n}</span>}
              </button>
            )
          })}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search word, reading, meaning or note"
          className={`${ui.input} min-w-64 flex-1 py-1.5 text-sm`}
        />
      </div>

      {words.data && total === 0 && (
        <p className="mt-8 text-muted">
          {search ? 'No words match your search.' : status === 'learning' ? 'No words yet. Open the Reader and click a word to save it.' : 'Nothing here.'}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-panel empty:hidden">
        {words.data?.items.map((w) => <WordRow key={w.id} word={w} />)}
      </ul>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button className={ui.secondary} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-muted tabular-nums">
            {page + 1} / {pages}
          </span>
          <button className={ui.secondary} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function WordRow({ word }) {
  const setStatus = useSetWordStatus()
  const update = useUpdateWord()
  const remove = useRemoveWord()
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [meaning, setMeaning] = useState(word.customMeaning ?? '')
  const [note, setNote] = useState(word.note ?? '')

  return (
    <li className="p-4">
      <div className="flex items-start gap-4">
        <div className="w-36 shrink-0">
          <div className="text-xl">{word.lemma}</div>
          {word.reading && word.reading !== word.lemma && <div className="text-xs text-muted">{word.reading}</div>}
          {word.jlpt && <span className="mt-1 inline-block rounded bg-accent-soft px-1.5 text-xs text-accent">{word.jlpt}</span>}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className={word.customMeaning ? 'font-medium' : ''}>{word.customMeaning ?? word.meaning ?? <span className="text-muted italic">No meaning</span>}</p>
          {word.note && <p className="mt-1 text-muted">📝 {word.note}</p>}
          {word.contexts[0] && (
            <button className="mt-1 block max-w-full truncate text-left text-muted hover:text-ink" onClick={() => setOpen((o) => !o)} title="Show sentences">
              {word.contexts[0].sentence}
              {word.contexts.length > 1 && <span className="ml-1 text-xs">(+{word.contexts.length - 1})</span>}
            </button>
          )}
          {open && (
            <ul className="mt-2 space-y-1 border-l-2 border-line pl-3">
              {word.contexts.map((c) => (
                <li key={c.id}>
                  {c.startMs != null && <span className="mr-2 text-xs text-muted tabular-nums">{formatTimestamp(c.startMs)}</span>}
                  {c.sentence}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <select
            value={word.status}
            onChange={(e) => setStatus.mutate({ id: word.id, status: e.target.value })}
            className="rounded-lg border border-line bg-panel px-2 py-1 text-sm"
            aria-label={`Status of ${word.lemma}`}
          >
            <option value="learning">Learning</option>
            <option value="known">Known</option>
            <option value="ignored">Ignored</option>
          </select>
          {word.status === 'learning' && word.nextDue && <span className="text-xs text-muted">{formatDue(word.nextDue)}</span>}
          <div className="flex gap-1">
            <button className={ui.ghost} onClick={() => setEditing((e) => !e)}>
              Edit
            </button>
            <button
              className={ui.danger}
              onClick={() => {
                if (window.confirm(`Delete ${word.lemma} and its review history?`)) remove.mutate(word.id)
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      {editing && (
        <form
          className="mt-3 grid gap-2 rounded-lg bg-paper p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            update.mutate({ id: word.id, customMeaning: meaning, note }, { onSuccess: () => setEditing(false) })
          }}
        >
          <label className="grid gap-1">
            <span className="text-muted">My meaning (replaces the dictionary meaning in reviews; leave empty to use the dictionary)</span>
            <input value={meaning} onChange={(e) => setMeaning(e.target.value)} className={ui.input} placeholder={word.meaning ?? ''} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={ui.input} />
          </label>
          <div className="flex gap-2">
            <button className={ui.primary} disabled={update.isPending}>
              Save
            </button>
            <button type="button" className={ui.ghost} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
