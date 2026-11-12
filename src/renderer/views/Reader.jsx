import { useState } from 'react'
import { Link, useParams } from 'react-router'
import RubyText from '../components/RubyText.jsx'
import { ui } from '../components/ui.js'
import WordPanel from '../components/WordPanel.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'
import { errorMessage } from '../lib/errors.js'
import { formatTimestamp } from '../lib/format.js'
import { useTextAnalysis } from '../queries/texts.js'

function wordClass(word, highlightUnknown) {
  if (!word.counted) return ''
  const base = 'cursor-pointer rounded px-0.5 hover:bg-accent-soft'
  if (word.status === 'learning') return `${base} bg-learning`
  if (word.status === 'known' || word.status === 'ignored') return base
  return highlightUnknown ? `${base} underline decoration-unknown decoration-2 underline-offset-[6px]` : base
}

export default function Reader() {
  const id = Number(useParams().id)
  const [selection, setSelection] = useState(null)
  const { showFurigana, highlightUnknown, toggle } = useSettings()
  const analysis = useTextAnalysis(id)
  const data = analysis.data?.text?.id === id ? analysis.data : null

  // Re-read the selected word from fresh data so its status updates after saving.
  const line = selection && data?.lines[selection.line]
  const selected = line?.words[selection.index] ? { word: line.words[selection.index], line, textId: id } : null
  const hasTimes = data?.lines.some((l) => l.startMs != null)

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[1fr_320px] gap-6 p-8">
      <section className="min-w-0">
        <div className="mb-2 flex items-center gap-3">
          <Link to="/reader" className="text-sm text-muted hover:text-ink">
            ← Library
          </Link>
          <h1 className="truncate text-xl font-bold">{data?.text.title}</h1>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {data && (
            <div className="rounded-lg bg-accent-soft px-3 py-1 text-sm" data-testid="score">
              <span className="font-bold text-accent">{data.stats.percent}%</span> known · {data.stats.learning} learning · {data.stats.unknown} new
            </div>
          )}
          {data?.stats.jlpt && (
            <div className="rounded-lg border border-line px-3 py-1 text-sm" title="Level needed to know 90% of the words">
              ≈ {data.stats.jlpt}
            </div>
          )}
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showFurigana} onChange={() => toggle('showFurigana')} />
              Furigana
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={highlightUnknown} onChange={() => toggle('highlightUnknown')} />
              Highlight new words
            </label>
          </div>
        </div>

        {!data && analysis.isFetching && <p className="text-muted">Analyzing…</p>}
        {analysis.isError && <p className="text-red-600">{errorMessage(analysis.error)}</p>}
        {data && !data.dictionary && (
          <p className="mb-3 rounded-lg border border-line bg-panel p-3 text-sm text-muted">
            Dictionary not installed: meanings and JLPT levels are unavailable. Run <code>npm run dict:build</code>.
          </p>
        )}

        {data && (
          <article className={`${ui.card} p-6 text-2xl leading-[2.4] ${showFurigana ? '' : 'hide-furigana'}`}>
            {data.lines.map((l, li) => (
              <div key={li} className="flex min-h-[1em] gap-4">
                {hasTimes && <span className="w-14 shrink-0 pt-3 text-right text-xs leading-none text-muted tabular-nums">{l.startMs != null ? formatTimestamp(l.startMs) : ''}</span>}
                <p className="min-w-0 flex-1">
                  {l.words.map((w, wi) => (
                    <span
                      key={wi}
                      className={wordClass(w, highlightUnknown)}
                      onClick={w.counted ? () => setSelection({ line: li, index: wi }) : undefined}
                    >
                      <RubyText segments={w.segments} />
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </article>
        )}

        {data?.stats.topUnknown.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-muted">Most frequent new words</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.stats.topUnknown.map((u) => (
                <span key={u.lemma} className="rounded-lg border border-line bg-panel px-2 py-1 text-sm">
                  {u.lemma} <span className="text-muted">×{u.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="sticky top-8 self-start">
        <WordPanel selection={selected} dictionaryAvailable={data?.dictionary} onClose={() => setSelection(null)} />
      </div>
    </div>
  )
}
