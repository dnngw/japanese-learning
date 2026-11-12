import { useEffect, useReducer } from 'react'
import { Link } from 'react-router'
import StrokeAnimation from '../components/StrokeAnimation.jsx'
import { ui } from '../components/ui.js'
import { useJapaneseVoice } from '../hooks/useJapaneseVoice.js'
import { useKanaSpeaker } from '../hooks/useKanaSpeaker.js'
import { errorMessage } from '../lib/errors.js'
import { useAnswerCard, useReviewQueue, useReviewStats } from '../queries/review.js'

const RATINGS = [
  { value: 1, label: 'Again', key: '1', className: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-300' },
  { value: 2, label: 'Hard', key: '2', className: 'border-line' },
  { value: 3, label: 'Good', key: '3', className: 'border-accent text-accent' },
  { value: 4, label: 'Easy', key: '4', className: 'border-line' },
]
const STATE_LABEL = ['New', 'Learning', 'Review', 'Relearning']

// Per-card session state: is the answer shown, and when did the card appear.
function cardReducer(state, action) {
  switch (action.type) {
    case 'show':
      return { cardId: action.cardId, revealed: false, shownAt: Date.now() }
    case 'reveal':
      return { ...state, revealed: true }
    default:
      return state
  }
}

export default function Review() {
  const queue = useReviewQueue()
  const stats = useReviewStats()
  const answer = useAnswerCard()
  const [session, dispatch] = useReducer(cardReducer, { cardId: null, revealed: false, shownAt: 0 })

  const current = queue.data?.[0] ?? null
  const busy = answer.isPending || queue.isFetching
  const isCurrent = current && current.cardId === session.cardId

  useEffect(() => {
    if (current && current.cardId !== session.cardId) dispatch({ type: 'show', cardId: current.cardId })
  }, [current, session.cardId])

  const revealed = isCurrent && session.revealed
  const rate = (rating) => {
    if (!current || !revealed || busy) return
    answer.mutate({ cardId: current.cardId, rating, durationMs: Math.min(Date.now() - session.shownAt, 3_600_000) })
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        dispatch({ type: 'reveal' })
      } else if (revealed) {
        const r = RATINGS.find((x) => x.key === e.key)
        if (r) rate(r.value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-baseline justify-between">
        <h1 className={ui.h1}>Review</h1>
        {stats.data && (
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{stats.data.due}</span> due · <span className="font-medium text-ink">{stats.data.newToday}</span> new ·{' '}
            {stats.data.reviewedToday} reviewed today
          </p>
        )}
      </div>

      {queue.isPending && <p className="mt-8 text-muted">Loading…</p>}
      {queue.isError && <p className="mt-8 text-red-600">{errorMessage(queue.error)}</p>}
      {answer.isError && <p className="mt-4 text-sm text-red-600">{errorMessage(answer.error)}</p>}

      {queue.data && !current && (
        <div className={`${ui.card} mt-10 p-10 text-center`}>
          <div className="text-xl font-bold">All done for now</div>
          <p className="mt-2 text-sm text-muted">New reviews appear when they are due. Meanwhile, read something new or practice.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/reader" className={ui.primary}>
              Open the Reader
            </Link>
            <Link to="/practice" className={ui.secondary}>
              Practice
            </Link>
          </div>
        </div>
      )}

      {current && (
        <div className={`${ui.card} mt-6 p-8`}>
          <div className="text-xs text-muted">
            {current.kind === 'kana' ? `Kana · ${current.kana.script === 'hira' ? 'hiragana' : 'katakana'}` : 'Word'} · {STATE_LABEL[current.state]}
          </div>
          {current.kind === 'kana' ? <KanaCard item={current} revealed={revealed} /> : <WordCard item={current} revealed={revealed} />}

          {!revealed ? (
            <div className="mt-8 text-center">
              <button onClick={() => dispatch({ type: 'reveal' })} className={ui.primary}>
                Show answer <span className="opacity-70">(Space)</span>
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  disabled={busy}
                  onClick={() => rate(r.value)}
                  className={`rounded-lg border bg-panel py-2 text-sm hover:bg-accent-soft disabled:opacity-50 ${r.className}`}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-xs opacity-70">
                    {current.intervals[r.value]} · {r.key}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WordCard({ item, revealed }) {
  const speak = useJapaneseVoice()
  return (
    <>
      {item.context && <Sentence {...item.context} />}
      <div className="mt-6 text-center text-5xl font-bold">{item.word.lemma}</div>
      {revealed && (
        <>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-xl text-muted">{item.word.reading}</span>
            {speak && (
              <button onClick={() => speak(item.word.reading || item.word.lemma)} className="rounded-md border border-line px-2 py-0.5 text-sm hover:bg-accent-soft" aria-label="Play pronunciation">
                ▶
              </button>
            )}
          </div>
          <ol className="mx-auto mt-5 max-w-md list-decimal space-y-1 pl-5 text-left">
            {item.meanings.length > 0 ? item.meanings.map((m, i) => <li key={i}>{m}</li>) : <li className="list-none text-muted italic">No meaning stored for this word.</li>}
          </ol>
        </>
      )}
    </>
  )
}

function KanaCard({ item, revealed }) {
  const { play } = useKanaSpeaker()
  const kana = item.kana
  useEffect(() => {
    if (revealed) play(kana)
    // play once when the answer is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, kana.key, kana.script])
  return (
    <div className="text-center">
      <div className="mt-4 text-8xl leading-none">{kana.char}</div>
      {revealed && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="text-3xl">{kana.romaji}</div>
          <button onClick={() => play(kana)} className={ui.secondary}>
            ▶ Play
          </button>
          <StrokeAnimation char={kana.char} size={120} />
        </div>
      )}
    </div>
  )
}

// The sentence the word was saved from, with the word highlighted.
function Sentence({ sentence, surface }) {
  const i = surface ? sentence.indexOf(surface) : -1
  return (
    <p className="mt-3 text-center text-xl leading-relaxed">
      {i < 0 ? (
        sentence
      ) : (
        <>
          {sentence.slice(0, i)}
          <mark className="rounded bg-learning px-0.5 text-ink">{surface}</mark>
          {sentence.slice(i + surface.length)}
        </>
      )}
    </p>
  )
}
