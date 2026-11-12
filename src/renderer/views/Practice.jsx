import { useEffect, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toHiragana } from 'wanakana'
import ChoiceList from '../components/ChoiceList.jsx'
import KanaInput from '../components/KanaInput.jsx'
import { ui } from '../components/ui.js'
import { useJapaneseVoice } from '../hooks/useJapaneseVoice.js'
import { errorMessage } from '../lib/errors.js'
import { useAppSettings } from '../queries/app.js'
import { useRecordPractice, useStartPractice } from '../queries/practice.js'

const MODES = [
  { id: 'meaning', title: 'Meaning', text: 'See a word, pick its meaning. Wrong choices are words of the same kind and level.' },
  { id: 'reading', title: 'Reading', text: 'See a kanji word, type its reading (romaji turns into kana).' },
  { id: 'cloze', title: 'Fill the gap', text: 'A sentence you saved, with the word missing. Pick the word.' },
  { id: 'listening', title: 'Dictation', text: 'Listen to a word, type what you hear in kana.', needsVoice: true },
  { id: 'order', title: 'Word order', text: 'Put the parts of a sentence you saved back in order.' },
]

const initial = { phase: 'pick', mode: null, questions: [], index: 0, results: [], answered: null, startedAt: 0 }

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...initial, phase: 'run', mode: action.mode, questions: action.questions, startedAt: Date.now() }
    case 'answer': {
      const q = state.questions[state.index]
      const result = { wordId: q.wordId, correct: action.correct, durationMs: Date.now() - state.startedAt, question: q, given: action.given }
      return { ...state, answered: { correct: action.correct, given: action.given }, results: [...state.results, result] }
    }
    case 'next':
      return state.index + 1 >= state.questions.length
        ? { ...state, phase: 'done', answered: null }
        : { ...state, index: state.index + 1, answered: null, startedAt: Date.now() }
    case 'reset':
      return initial
    default:
      return state
  }
}

export default function Practice() {
  const [state, dispatch] = useReducer(reducer, initial)
  const start = useStartPractice()
  const record = useRecordPractice()
  const speak = useJapaneseVoice()
  const { data: settings } = useAppSettings()
  const [count, setCount] = useState(10)
  const [empty, setEmpty] = useState(null)

  const begin = (mode) => {
    setEmpty(null)
    start.mutate(
      { mode, count },
      {
        onSuccess: (session) => {
          if (session.questions.length === 0) setEmpty({ mode, poolSize: session.poolSize })
          else dispatch({ type: 'start', mode, questions: session.questions })
        },
      },
    )
  }

  // Save results once when the session ends.
  useEffect(() => {
    if (state.phase === 'done' && state.results.length) {
      record.mutate(state.results.map(({ wordId, correct, durationMs }) => ({ wordId, correct, durationMs: Math.min(durationMs, 3_600_000) })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  if (state.phase === 'pick') {
    return (
      <div className={ui.page}>
        <h1 className={ui.h1}>Practice</h1>
        <p className={ui.sub}>
          Quizzes from your own words and sentences, any time.{' '}
          {settings?.practiceAffectsSchedule ? 'Results count toward your review schedule (once per word per day).' : 'Results do not change your review schedule (you can turn that on in Settings).'}
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted">Questions:</span>
          {[5, 10, 20].map((n) => (
            <button key={n} onClick={() => setCount(n)} className={`rounded-lg border px-3 py-1 ${count === n ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => {
            const disabled = m.needsVoice && !speak
            return (
              <button
                key={m.id}
                disabled={disabled || start.isPending}
                onClick={() => begin(m.id)}
                className={`${ui.card} p-5 text-left hover:border-accent disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="font-bold">{m.title}</div>
                <div className="mt-1 text-sm text-muted">{m.text}</div>
                {disabled && <div className="mt-2 text-xs text-red-600">Needs a Japanese text-to-speech voice in your system settings.</div>}
              </button>
            )
          })}
        </div>
        {start.isError && <p className="mt-4 text-sm text-red-600">{errorMessage(start.error)}</p>}
        {empty && (
          <p className="mt-4 rounded-lg border border-line bg-panel p-4 text-sm">
            {empty.poolSize === 0 ? 'You have no saved words yet. ' : 'None of your words fit this mode yet (it needs saved sentences, kanji words or dictionary meanings). '}
            <Link to="/reader" className="text-accent underline">
              Read a text
            </Link>{' '}
            and save some words first.
          </p>
        )}
      </div>
    )
  }

  if (state.phase === 'done') {
    const correct = state.results.filter((r) => r.correct).length
    const mistakes = state.results.filter((r) => !r.correct)
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className={ui.h1}>Practice finished</h1>
        <div className={`${ui.card} mt-6 p-8 text-center`}>
          <div className="text-5xl font-bold tabular-nums">
            {correct} / {state.results.length}
          </div>
          <p className="mt-2 text-sm text-muted">
            {record.data?.counted ? `${record.data.counted} answers counted toward your review schedule.` : 'Your review schedule was not changed.'}
          </p>
        </div>
        {mistakes.length > 0 && (
          <>
            <h2 className="mt-6 font-bold">To look at again</h2>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
              {mistakes.map((m, i) => (
                <li key={i} className="px-4 py-3 text-sm">
                  <span className="text-lg">{m.question.prompt?.lemma ?? m.question.reveal?.lemma ?? m.question.lemma}</span>{' '}
                  <span className="text-muted">— {correctAnswerText(m.question)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-6 flex gap-2">
          <button className={ui.primary} onClick={() => begin(state.mode)}>
            Again
          </button>
          <button className={ui.secondary} onClick={() => dispatch({ type: 'reset' })}>
            Choose another mode
          </button>
        </div>
      </div>
    )
  }

  const q = state.questions[state.index]
  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className={ui.h1}>{MODES.find((m) => m.id === state.mode).title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="tabular-nums">
            {state.index + 1} / {state.questions.length}
          </span>
          <button className={ui.ghost} onClick={() => dispatch({ type: 'reset' })}>
            Quit
          </button>
        </div>
      </div>
      <div className={`${ui.card} mt-6 p-8`}>
        <Question key={q.id + state.index} q={q} answered={state.answered} onAnswer={(correct, given) => dispatch({ type: 'answer', correct, given })} speak={speak} />
        {state.answered && <Feedback q={q} answered={state.answered} onNext={() => dispatch({ type: 'next' })} />}
      </div>
    </div>
  )
}

function correctAnswerText(q) {
  if (q.choices) return q.choices[q.answerIndex]
  if (q.mode === 'order') return q.answer.join('')
  return q.answer
}

function Feedback({ q, answered, onNext }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
      <div className="text-sm" role="status">
        {answered.correct ? (
          <span className="font-medium text-accent">Correct!</span>
        ) : (
          <span>
            <span className="font-medium text-red-600">Not quite.</span> Answer: <span className="text-base">{correctAnswerText(q)}</span>
          </span>
        )}
        {q.mode === 'listening' && (
          <span className="ml-2 text-muted">
            {q.reveal.lemma} — {q.reveal.meaning}
          </span>
        )}
      </div>
      <button ref={ref} className={ui.primary} onClick={onNext}>
        Next <span className="opacity-70">(Enter)</span>
      </button>
    </div>
  )
}

function Highlighted({ sentence, surface }) {
  if (!sentence) return null
  const i = surface ? sentence.indexOf(surface) : -1
  return (
    <p className="mt-2 text-center text-lg text-muted">
      {i < 0 ? sentence : (
        <>
          {sentence.slice(0, i)}
          <mark className="rounded bg-learning px-0.5 text-ink">{surface}</mark>
          {sentence.slice(i + surface.length)}
        </>
      )}
    </p>
  )
}

function Question({ q, answered, onAnswer, speak }) {
  const [picked, setPicked] = useState(null)
  const pick = (i) => {
    if (answered) return
    setPicked(i)
    onAnswer(i === q.answerIndex, q.choices[i])
  }
  const checkTyped = (value) => {
    if (answered || !value.trim()) return
    const given = toHiragana(value.trim(), { passRomaji: false })
    onAnswer(q.accept.includes(given), given)
  }

  if (q.mode === 'meaning') {
    return (
      <>
        <div className="text-center text-5xl font-bold">{q.prompt.lemma}</div>
        <Highlighted sentence={q.prompt.sentence} surface={q.prompt.surface} />
        <div className="mt-6">
          <ChoiceList choices={q.choices} answerIndex={q.answerIndex} picked={picked} onPick={pick} />
        </div>
      </>
    )
  }
  if (q.mode === 'reading') {
    return (
      <>
        <div className="text-center text-5xl font-bold">{q.prompt.lemma}</div>
        <Highlighted sentence={q.prompt.sentence} surface={q.prompt.surface} />
        <p className="mt-6 text-center text-sm text-muted">Type the reading and press Enter.</p>
        <div className="mx-auto mt-2 max-w-xs">
          <KanaInput onSubmit={checkTyped} disabled={!!answered} />
        </div>
      </>
    )
  }
  if (q.mode === 'cloze') {
    return (
      <>
        <p className="text-center text-2xl leading-relaxed">
          {q.prompt.before}
          <span className="mx-1 inline-block min-w-16 border-b-2 border-accent text-accent">{answered ? q.prompt.answerSurface : '　'}</span>
          {q.prompt.after}
        </p>
        {q.prompt.hint && <p className="mt-2 text-center text-sm text-muted">Hint: {q.prompt.hint}</p>}
        <div className="mt-6">
          <ChoiceList choices={q.choices} answerIndex={q.answerIndex} picked={picked} onPick={pick} />
        </div>
      </>
    )
  }
  if (q.mode === 'listening') return <Listening q={q} answered={answered} onSubmit={checkTyped} speak={speak} />
  if (q.mode === 'order') return <Order q={q} answered={answered} onAnswer={onAnswer} />
  return null
}

function Listening({ q, answered, onSubmit, speak }) {
  useEffect(() => {
    speak?.(q.speak)
  }, [q.speak, speak])
  return (
    <>
      <div className="text-center">
        <button className={ui.secondary} onClick={() => speak?.(q.speak)}>
          ▶ Play again
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-muted">Type what you hear (in kana) and press Enter.</p>
      <div className="mx-auto mt-2 max-w-xs">
        <KanaInput onSubmit={onSubmit} disabled={!!answered} />
      </div>
    </>
  )
}

function Order({ q, answered, onAnswer }) {
  const [placed, setPlaced] = useState([]) // indexes into q.chunks
  const remaining = q.chunks.map((c, i) => i).filter((i) => !placed.includes(i))
  const check = () => {
    const given = placed.map((i) => q.chunks[i])
    onAnswer(given.join('') === q.answer.join(''), given.join(' '))
  }
  return (
    <>
      {q.meaning && <p className="text-center text-sm text-muted">Contains {q.lemma}: {q.meaning}</p>}
      <div className="mt-4 flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line p-3 text-xl" data-testid="order-answer">
        {placed.length === 0 && <span className="text-sm text-muted">Click the parts below in order</span>}
        {placed.map((i) => (
          <button key={i} disabled={!!answered} onClick={() => setPlaced((p) => p.filter((x) => x !== i))} className="rounded-lg bg-accent-soft px-3 py-1">
            {q.chunks[i]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xl" data-testid="order-chunks">
        {remaining.map((i) => (
          <button key={i} disabled={!!answered} onClick={() => setPlaced((p) => [...p, i])} className="rounded-lg border border-line bg-panel px-3 py-1 hover:border-accent">
            {q.chunks[i]}
          </button>
        ))}
      </div>
      {!answered && (
        <div className="mt-6 text-center">
          <button className={ui.primary} disabled={remaining.length > 0} onClick={check}>
            Check
          </button>
        </div>
      )}
    </>
  )
}
