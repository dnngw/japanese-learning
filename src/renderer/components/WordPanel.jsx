import { errorMessage } from '../lib/errors.js'
import { useEntry } from '../queries/dictionary.js'
import { useSaveWord } from '../queries/words.js'
import RubyText from './RubyText.jsx'

const STATUS_LABEL = { learning: 'Learning', known: 'Known', ignored: 'Ignored' }

// Side panel for the word the user clicked in the reader.
export default function WordPanel({ selection, dictionaryAvailable, onClose }) {
  const save = useSaveWord()
  const entry = useEntry(selection?.word.jmdictId ?? null)

  if (!selection) {
    return (
      <aside className="rounded-xl border border-line bg-panel p-5 text-sm text-muted">
        Click a word to see its meaning and save it.
      </aside>
    )
  }
  const { word, line, textId } = selection
  const sentence = line.text
  const saveAs = (status) =>
    save.mutate({
      jmdictId: word.jmdictId,
      lemma: word.lemma,
      reading: word.reading,
      status,
      surface: word.surface,
      sentence,
      textId,
      startMs: line.startMs ?? null,
      endMs: line.endMs ?? null,
    })

  return (
    <aside className="rounded-xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-3xl leading-relaxed">
          <RubyText segments={word.segments} />
        </div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
          ×
        </button>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-muted">Dictionary form</dt>
          <dd className="text-base">{word.lemma}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-muted">Reading</dt>
          <dd>{word.reading}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-muted">Status</dt>
          <dd>{word.status ? STATUS_LABEL[word.status] : 'New'}</dd>
        </div>
      </dl>

      <Meanings entry={entry} hasId={word.jmdictId != null} dictionaryAvailable={dictionaryAvailable} />

      <p className="mt-4 rounded-lg bg-paper p-3 text-sm leading-relaxed">{sentence}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={save.isPending}
          onClick={() => saveAs('learning')}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:text-black"
        >
          Save to learn
        </button>
        <button
          disabled={save.isPending}
          onClick={() => saveAs('known')}
          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-accent-soft disabled:opacity-50"
        >
          I know this
        </button>
        <button
          disabled={save.isPending}
          onClick={() => saveAs('ignored')}
          className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-50"
        >
          Ignore
        </button>
      </div>
      {save.isError && <p className="mt-2 text-sm text-red-600">{errorMessage(save.error)}</p>}
    </aside>
  )
}

function Meanings({ entry, hasId, dictionaryAvailable }) {
  if (!dictionaryAvailable) {
    return <p className="mt-4 text-sm text-muted italic">Dictionary not installed (run npm run dict:build).</p>
  }
  if (!hasId) return <p className="mt-4 text-sm text-muted italic">Not found in the dictionary.</p>
  if (entry.isPending) return <p className="mt-4 text-sm text-muted">Loading…</p>
  if (entry.isError || !entry.data) return <p className="mt-4 text-sm text-red-600">Could not load the entry.</p>

  const e = entry.data
  // Other spellings (e.g. 喰べる for 食べる); readings are already shown above.
  const others = e.kanji.filter((k) => k !== e.kanji[0]).slice(0, 5)
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {e.jlpt && <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">{e.jlpt}</span>}
        {e.common && <span className="rounded border border-line px-1.5 py-0.5 text-muted">common</span>}
        {others.length > 0 && <span className="text-muted">also: {others.join('、')}</span>}
      </div>
      <ol className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
        {e.senses.slice(0, 6).map((s, i) => (
          <li key={i}>
            <div className="text-xs text-muted">{s.pos.join(', ')}</div>
            <div>
              <span className="text-muted">{i + 1}.</span> {s.gloss.join('; ')}
              {s.misc.length > 0 && <span className="text-xs text-muted"> ({s.misc.join(', ')})</span>}
            </div>
          </li>
        ))}
      </ol>
      {e.senses.length > 6 && <p className="mt-1 text-xs text-muted">+{e.senses.length - 6} more meanings</p>}
    </div>
  )
}
