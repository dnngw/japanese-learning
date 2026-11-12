import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toHiragana } from 'wanakana'
import { ALL_KANA, GROUPS, kanaByChar, kanaCardKey, ROWS, SIMILAR_SETS } from '../../shared/kana.js'
import ChoiceList from '../components/ChoiceList.jsx'
import KanaInput from '../components/KanaInput.jsx'
import StrokeAnimation from '../components/StrokeAnimation.jsx'
import TracePad from '../components/TracePad.jsx'
import { ui } from '../components/ui.js'
import { KANA_EXAMPLES } from '../data/kanaExamples.js'
import strokeData from '../data/kana-strokes.json'
import { useKanaSpeaker } from '../hooks/useKanaSpeaker.js'
import { errorMessage } from '../lib/errors.js'
import { sample, shuffle } from '../lib/random.js'
import { useAppSettings, useUpdateSettings } from '../queries/app.js'
import { useKanaProgress, useRecordKana } from '../queries/practice.js'

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'learn', label: 'Learn' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'similar', label: 'Look-alikes' },
  { id: 'write', label: 'Write' },
  { id: 'refresh', label: 'Refresh test' },
  { id: 'rules', label: 'Special rules' },
]
const BASIC = ALL_KANA.filter((k) => ROWS.find((r) => r.cells.includes(k)).group === 'basic')
const FAST_MS = 3000

// Romaji answer check: accepts Hepburn and Kunrei spellings (shi/si, tsu/tu, fu/hu…).
export function romajiMatches(input, kana) {
  const v = input.trim().toLowerCase()
  if (!v) return false
  if (v === kana.romaji || toHiragana(v) === kana.hira || toHiragana(v) === toHiragana(kana.romaji)) return true
  return kana.key === 'wo' && v === 'o'
}

export default function Kana() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'table'
  const [script, setScript] = useState('hira')

  return (
    <div className={ui.page}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>Kana</h1>
        <ScriptToggle script={script} setScript={setScript} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.id ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'table' && <KanaTable script={script} />}
        {tab === 'learn' && <Learn key={script} script={script} />}
        {tab === 'quiz' && <Quiz key={script} script={script} />}
        {tab === 'similar' && <Similar />}
        {tab === 'write' && <Write key={script} script={script} />}
        {tab === 'refresh' && <Refresh key={script} script={script} />}
        {tab === 'rules' && <Rules />}
      </div>
    </div>
  )
}

function ScriptToggle({ script, setScript }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5 text-sm">
      {[
        ['hira', 'Hiragana'],
        ['kata', 'Katakana'],
      ].map(([value, label]) => (
        <button key={value} onClick={() => setScript(value)} className={`rounded-md px-3 py-1 ${script === value ? 'bg-accent-soft font-medium text-accent' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ---------- Table ----------

function KanaTable({ script }) {
  const { data: progress = {} } = useKanaProgress()
  const [current, setCurrent] = useState(null)
  const { play } = useKanaSpeaker()
  const pick = (kana) => {
    setCurrent(kana)
    play(kana)
  }
  const learned = BASIC.filter((k) => progress[kanaCardKey(script, k.key)]).length

  return (
    <div className="grid grid-cols-[1fr_280px] gap-8">
      <div>
        <p className="text-sm text-muted">
          Click a character to hear it and see its stroke order. Learned: {learned} / {BASIC.length} basic. <Dot state="learned" /> learned <Dot state="weak" /> needs practice
        </p>
        {GROUPS.map((g) => (
          <section key={g.id}>
            <h2 className="mt-6 mb-2 text-sm font-medium text-muted">{g.label}</h2>
            <div className={`grid gap-2 ${g.id === 'yoon' ? 'grid-cols-3' : 'grid-cols-5'}`}>
              {ROWS.filter((r) => r.group === g.id).flatMap((row) =>
                row.cells.map((kana, i) =>
                  kana ? (
                    <button
                      key={kana.key}
                      onClick={() => pick(kana)}
                      className={`relative flex flex-col items-center rounded-xl border py-2.5 hover:border-accent ${current?.key === kana.key ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}
                    >
                      <span className="text-3xl">{kana[script]}</span>
                      <span className="text-xs text-muted">{kana.romaji}</span>
                      <ProgressDot p={progress[kanaCardKey(script, kana.key)]} />
                    </button>
                  ) : (
                    <div key={`${row.id}-${i}`} />
                  ),
                ),
              )}
            </div>
          </section>
        ))}
      </div>
      <aside className={`${ui.card} sticky top-8 self-start p-6 text-center`}>
        {current ? <KanaDetail kana={current} script={script} /> : <p className="text-sm text-muted">Pick a character.</p>}
      </aside>
    </div>
  )
}

function Dot({ state }) {
  return <span className={`mx-1 inline-block size-2 rounded-full ${state === 'learned' ? 'bg-accent' : 'bg-amber-500'}`} />
}

function ProgressDot({ p }) {
  if (!p) return null
  const weak = p.state === 1 || p.state === 3 || p.lapses > 0
  return <span className={`absolute top-1.5 right-1.5 size-2 rounded-full ${weak ? 'bg-amber-500' : 'bg-accent'}`} />
}

function KanaDetail({ kana, script }) {
  const { play, speak } = useKanaSpeaker()
  const char = kana[script]
  const example = KANA_EXAMPLES[char]
  const [replay, setReplay] = useState(0)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-7xl leading-none">{char}</div>
      <div className="text-2xl">{kana.romaji}</div>
      <div className="text-sm text-muted">
        {kana.hira} / {kana.kata}
      </div>
      <button onClick={() => play(kana)} className={ui.secondary}>
        ▶ Play
      </button>
      {strokeData.strokes[char] ? (
        <button onClick={() => setReplay((r) => r + 1)} title="Replay stroke order" className="mt-2">
          <StrokeAnimation char={char} size={150} replayKey={replay} />
        </button>
      ) : (
        <p className="text-xs text-muted">Written as {[...char].join(' + ')}</p>
      )}
      {example && (
        <div className="mt-2 text-sm">
          <button onClick={() => speak?.(example[0])} disabled={!speak} className="text-lg hover:text-accent">
            {example[0]}
          </button>{' '}
          <span className="text-muted">= {example[1]}</span>
        </div>
      )}
      <Mnemonic char={char} />
    </div>
  )
}

// The learner's own memory aid for a character, saved in settings.
function Mnemonic({ char }) {
  const { data: settings } = useAppSettings()
  const saved = settings?.kanaMnemonics?.[char] ?? ''
  // Remount when the character or the stored text changes, so the field starts from it.
  return <MnemonicField key={`${char}\u0000${saved}`} char={char} saved={saved} settings={settings} />
}

function MnemonicField({ char, saved, settings }) {
  const update = useUpdateSettings()
  const [value, setValue] = useState(saved)
  return (
    <label className="mt-3 block w-full text-left text-xs text-muted">
      My memory aid
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== saved && update.mutate({ kanaMnemonics: { ...settings.kanaMnemonics, [char]: value.slice(0, 300) } })}
        rows={2}
        placeholder="e.g. あ looks like an apple with a stalk"
        className={`${ui.input} mt-1 w-full text-sm text-ink`}
      />
    </label>
  )
}

// ---------- Learn a row ----------

function Learn({ script }) {
  const { data: progress = {} } = useKanaProgress()
  const [rowId, setRowId] = useState(null)
  const row = ROWS.find((r) => r.id === rowId)

  if (!row) {
    return (
      <div>
        <p className="text-sm text-muted">Learn one row at a time: sound, stroke order and an example word for each character, then a short quiz.</p>
        {GROUPS.map((g) => (
          <section key={g.id}>
            <h2 className="mt-6 mb-2 text-sm font-medium text-muted">{g.label}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {ROWS.filter((r) => r.group === g.id).map((r) => {
                const cells = r.cells.filter(Boolean)
                const done = cells.filter((k) => progress[kanaCardKey(script, k.key)]).length
                return (
                  <button key={r.id} onClick={() => setRowId(r.id)} className={`rounded-xl border bg-panel p-3 text-left hover:border-accent ${done === cells.length ? 'border-accent' : 'border-line'}`}>
                    <div className="text-xl">{cells.map((k) => k[script]).join('')}</div>
                    <div className="mt-1 text-xs text-muted">
                      {r.label} row · {done}/{cells.length}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    )
  }

  const nextRow = ROWS[ROWS.indexOf(row) + 1]
  return <Lesson key={row.id} row={row} script={script} onExit={() => setRowId(null)} onNext={nextRow ? () => setRowId(nextRow.id) : null} />
}

function Lesson({ row, script, onExit, onNext }) {
  const cells = row.cells.filter(Boolean)
  const [step, setStep] = useState(0) // 0..n-1 = study, n = quiz
  const { play } = useKanaSpeaker()

  useEffect(() => {
    if (step < cells.length) play(cells[step])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (step >= cells.length) return <RowQuiz cells={cells} script={script} onExit={onExit} onNext={onNext} onRetry={() => setStep(0)} />
  const kana = cells[step]
  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between text-sm text-muted">
        <button className={ui.ghost} onClick={onExit}>
          ← Rows
        </button>
        <span>
          {row.label} row · {step + 1} / {cells.length}
        </span>
      </div>
      <div className={`${ui.card} mt-3 p-6`}>
        <KanaDetail kana={kana} script={script} />
      </div>
      <div className="mt-4 flex justify-between">
        <button className={ui.secondary} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Previous
        </button>
        <button className={ui.primary} onClick={() => setStep((s) => s + 1)}>
          {step + 1 === cells.length ? 'Quiz' : 'Next'}
        </button>
      </div>
    </div>
  )
}

// Romaji options for a kana: the row's own characters plus random others.
function romajiOptions(kana, pool) {
  const others = shuffle(pool.filter((k) => k.romaji !== kana.romaji)).map((k) => k.romaji)
  const opts = shuffle([kana.romaji, ...[...new Set(others)].slice(0, 3)])
  return { choices: opts, answerIndex: opts.indexOf(kana.romaji) }
}

function RowQuiz({ cells, script, onExit, onNext, onRetry }) {
  const questions = useMemo(() => shuffle(cells).map((k) => ({ kana: k, ...romajiOptions(k, [...cells, ...BASIC]) })), [cells])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [results, setResults] = useState([])
  const record = useRecordKana()
  const { play } = useKanaSpeaker()
  const done = i >= questions.length

  useEffect(() => {
    if (done) record.mutate({ results, mode: 'lesson' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  if (done) {
    const correct = results.filter((r) => r.correct).length
    return (
      <div className={`${ui.card} mx-auto max-w-md p-8 text-center`}>
        <div className="text-4xl font-bold">
          {correct} / {results.length}
        </div>
        <p className="mt-2 text-sm text-muted">These characters are now in your reviews. Missed ones come back sooner.</p>
        {record.isError && <p className="mt-2 text-sm text-red-600">{errorMessage(record.error)}</p>}
        <div className="mt-6 flex justify-center gap-2">
          {onNext && (
            <button className={ui.primary} onClick={onNext}>
              Next row
            </button>
          )}
          <button className={ui.secondary} onClick={onRetry}>
            Study again
          </button>
          <button className={ui.ghost} onClick={onExit}>
            All rows
          </button>
        </div>
      </div>
    )
  }

  const q = questions[i]
  return (
    <div className="mx-auto max-w-md">
      <p className="text-center text-sm text-muted">
        Quiz {i + 1} / {questions.length}: which sound is this?
      </p>
      <div className={`${ui.card} mt-3 p-8 text-center`}>
        <div className="text-8xl leading-none">{q.kana[script]}</div>
        <div className="mt-6">
          <ChoiceList
            choices={q.choices}
            answerIndex={q.answerIndex}
            picked={picked}
            onPick={(p) => {
              setPicked(p)
              play(q.kana)
              setResults((r) => [...r, { script, key: q.kana.key, correct: p === q.answerIndex }])
            }}
          />
        </div>
        {picked != null && (
          <button
            autoFocus
            className={`${ui.primary} mt-6`}
            onClick={() => {
              setPicked(null)
              setI((n) => n + 1)
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- Quiz ----------

const QUIZ_TYPES = [
  { id: 'read', label: 'See → type romaji' },
  { id: 'listen', label: 'Hear → pick character' },
  { id: 'recall', label: 'Romaji → pick character' },
]

function Quiz({ script }) {
  const { data: progress = {} } = useKanaProgress()
  const [config, setConfig] = useState({ type: 'read', scope: 'learned' })
  const [session, setSession] = useState(null)
  const learned = ALL_KANA.filter((k) => progress[kanaCardKey(script, k.key)])
  const scopes = { learned, basic: BASIC, all: ALL_KANA }
  const pool = scopes[config.scope]

  if (session) return <QuizRun key={session.id} session={session} script={script} onExit={() => setSession(null)} onAgain={() => setSession({ ...session, id: Date.now(), items: sample(pool, 15) })} />

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <div className="text-sm font-medium">Question type</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUIZ_TYPES.map((t) => (
            <button key={t.id} onClick={() => setConfig((c) => ({ ...c, type: t.id }))} className={`rounded-lg border px-3 py-1.5 text-sm ${config.type === t.id ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">Characters</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ['learned', `Learned (${learned.length})`],
            ['basic', `Basic (${BASIC.length})`],
            ['all', `All (${ALL_KANA.length})`],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setConfig((c) => ({ ...c, scope: id }))} className={`rounded-lg border px-3 py-1.5 text-sm ${config.scope === id ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {pool.length < 4 ? (
        <p className="text-sm text-muted">Learn a few rows first (Learn tab), or choose Basic or All.</p>
      ) : (
        <button className={ui.primary} onClick={() => setSession({ id: Date.now(), type: config.type, items: sample(pool, 15), pool })}>
          Start ({Math.min(15, pool.length)} questions)
        </button>
      )}
    </div>
  )
}

function QuizRun({ session, script, onExit, onAgain }) {
  const { play } = useKanaSpeaker()
  const record = useRecordKana()
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState(null) // { correct, picked? }
  const [results, setResults] = useState([])
  const shownAt = useRef(0)
  const done = i >= session.items.length
  const kana = session.items[i]

  const choiceSet = useMemo(() => {
    if (!kana || session.type === 'read') return null
    const others = sample(session.pool.filter((k) => k.key !== kana.key), 3)
    const opts = shuffle([kana, ...others])
    return { choices: opts.map((k) => k[script]), answerIndex: opts.indexOf(kana) }
  }, [kana, session, script])

  useEffect(() => {
    shownAt.current = Date.now()
    if (kana && session.type === 'listen') play(kana)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  useEffect(() => {
    if (done) record.mutate({ results, mode: 'quiz' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const submit = (correct, picked) => {
    if (answer) return
    setAnswer({ correct, picked })
    if (session.type !== 'listen') play(kana)
    setResults((r) => [...r, { script, key: kana.key, correct, durationMs: Date.now() - shownAt.current }])
  }

  if (done) {
    const correct = results.filter((r) => r.correct).length
    const missed = results.filter((r) => !r.correct).map((r) => kanaByChar(ALL_KANA.find((k) => k.key === r.key)[script]))
    return (
      <div className={`${ui.card} mx-auto max-w-md p-8 text-center`}>
        <div className="text-4xl font-bold">
          {correct} / {results.length}
        </div>
        {missed.length > 0 && <p className="mt-3 text-2xl">{missed.map((k) => k[script]).join(' ')}</p>}
        <p className="mt-2 text-sm text-muted">{record.data?.recorded ? `${record.data.recorded} answers counted toward reviews.` : 'Quizzes do not change your review schedule unless enabled in Settings.'}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className={ui.primary} onClick={onAgain}>
            Again
          </button>
          <button className={ui.secondary} onClick={onExit}>
            Change settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="flex justify-between text-sm text-muted">
        <button className={ui.ghost} onClick={onExit}>
          ← Quiz settings
        </button>
        <span>
          {i + 1} / {session.items.length}
        </span>
      </div>
      <div className={`${ui.card} mt-3 p-8 text-center`}>
        {session.type === 'read' && (
          <>
            <div className="text-8xl leading-none">{kana[script]}</div>
            <div className="mx-auto mt-6 max-w-48">
              <KanaInput key={i} romaji placeholder="romaji" onSubmit={(v) => submit(romajiMatches(v, kana))} disabled={!!answer} />
            </div>
          </>
        )}
        {session.type === 'listen' && (
          <button className={ui.secondary} onClick={() => play(kana)}>
            ▶ Play again
          </button>
        )}
        {session.type === 'recall' && <div className="text-5xl">{kana.romaji}</div>}
        {choiceSet && (
          <div className="mt-6">
            <ChoiceList large choices={choiceSet.choices} answerIndex={choiceSet.answerIndex} picked={answer?.picked ?? null} onPick={(p) => submit(p === choiceSet.answerIndex, p)} />
          </div>
        )}
        {answer && (
          <div className="mt-6">
            <p className={answer.correct ? 'text-accent' : 'text-red-600'}>
              {answer.correct ? 'Correct!' : `It's ${kana[script]} (${kana.romaji})`}
            </p>
            <button
              autoFocus
              className={`${ui.primary} mt-3`}
              onClick={() => {
                setAnswer(null)
                setI((n) => n + 1)
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Look-alikes ----------

function makeSimilarRound() {
  return Array.from({ length: 12 }, () => {
    const set = sample(SIMILAR_SETS, 1)[0]
    const target = sample(set.chars, 1)[0]
    const choices = shuffle(set.chars)
    return { set, kana: kanaByChar(target), choices, answerIndex: choices.indexOf(target) }
  })
}

function Similar() {
  const [items, setItems] = useState(makeSimilarRound)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [results, setResults] = useState([])
  const { play } = useKanaSpeaker()
  const record = useRecordKana()
  const done = i >= items.length

  useEffect(() => {
    if (!done) play(items[i].kana)
    else record.mutate({ results, mode: 'quiz' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, done])

  if (done) {
    return (
      <div className={`${ui.card} mx-auto max-w-md p-8 text-center`}>
        <div className="text-4xl font-bold">
          {results.filter((r) => r.correct).length} / {results.length}
        </div>
        <button
          className={`${ui.primary} mt-6`}
          onClick={() => {
            setItems(makeSimilarRound())
            setI(0)
            setResults([])
          }}
        >
          Another round
        </button>
      </div>
    )
  }
  const q = items[i]
  return (
    <div className="mx-auto max-w-md">
      <p className="text-center text-sm text-muted">
        Characters that are easy to mix up. {i + 1} / {items.length}
      </p>
      <div className={`${ui.card} mt-3 p-8 text-center`}>
        <div className="text-4xl">{q.kana.romaji}</div>
        <button className={`${ui.ghost} mt-2`} onClick={() => play(q.kana)}>
          ▶ Play
        </button>
        <div className="mt-6">
          <ChoiceList
            large
            choices={q.choices}
            answerIndex={q.answerIndex}
            picked={picked}
            onPick={(p) => {
              setPicked(p)
              setResults((r) => [...r, { script: q.kana.script, key: q.kana.key, correct: p === q.answerIndex }])
            }}
          />
        </div>
        {picked != null && (
          <button
            autoFocus
            className={`${ui.primary} mt-6`}
            onClick={() => {
              setPicked(null)
              setI((n) => n + 1)
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- Write ----------

function Write({ script }) {
  const chars = ALL_KANA.map((k) => k[script]).filter((c) => strokeData.strokes[c])
  const [char, setChar] = useState(chars[0])
  const [result, setResult] = useState(null)
  const [replay, setReplay] = useState(0)
  const next = () => {
    setResult(null)
    setChar(chars[(chars.indexOf(char) + 1) % chars.length])
  }
  return (
    <div className="grid grid-cols-[1fr_auto] gap-8">
      <div>
        <p className="text-sm text-muted">Trace the character stroke by stroke. Each stroke is checked for position, direction and order.</p>
        <div className="mt-4 flex flex-col items-center">
          <TracePad key={char + replay} char={char} onComplete={setResult} />
          {result && (
            <div className="mt-2 text-center">
              <p className="text-accent">{result.mistakes === 0 ? 'Perfect!' : `Done with ${result.mistakes} retries.`}</p>
              <button autoFocus className={`${ui.primary} mt-2`} onClick={next}>
                Next character
              </button>
            </div>
          )}
        </div>
      </div>
      <aside className="w-56">
        <div className="text-center">
          <button onClick={() => setReplay((r) => r + 1)} title="Replay">
            <StrokeAnimation char={char} size={160} replayKey={replay} />
          </button>
          <p className="text-xs text-muted">Click to replay the stroke order</p>
        </div>
        <div className="mt-4 grid max-h-80 grid-cols-5 gap-1 overflow-y-auto">
          {chars.map((c) => (
            <button
              key={c}
              onClick={() => {
                setChar(c)
                setResult(null)
              }}
              className={`rounded border py-1 text-lg ${c === char ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

// ---------- Special rules ----------

const RULES = [
  {
    title: 'Small っ / ッ: double consonant',
    text: 'A small tsu is not pronounced as "tsu". It makes a short pause and doubles the next consonant.',
    examples: [['きって', 'kitte', 'stamp'], ['がっこう', 'gakkou', 'school'], ['ベッド', 'beddo', 'bed']],
  },
  {
    title: 'ー in katakana: long vowel',
    text: 'The bar lengthens the vowel before it. In vertical writing it is vertical.',
    examples: [['コーヒー', 'koohii', 'coffee'], ['ケーキ', 'keeki', 'cake'], ['スーパー', 'suupaa', 'supermarket']],
  },
  {
    title: 'Long vowels in hiragana',
    text: 'Hiragana writes long vowels with an extra vowel: ああ, いい, うう, and usually えい and おう.',
    examples: [['おかあさん', 'okaasan', 'mother'], ['せんせい', 'sensei', 'teacher'], ['ありがとう', 'arigatou', 'thank you']],
  },
  {
    title: 'Small ゃ ゅ ょ: combined sounds',
    text: 'A small ya/yu/yo after an i-column kana makes one syllable: き + ゃ = きゃ (kya).',
    examples: [['きょう', 'kyou', 'today'], ['しゃしん', 'shashin', 'photo'], ['りょこう', 'ryokou', 'trip']],
  },
  {
    title: 'Particles は, へ, を',
    text: 'As particles, は is read "wa", へ is read "e" and を is read "o".',
    examples: [['わたしは', 'watashi wa', 'as for me'], ['がっこうへ', 'gakkou e', 'to school'], ['ほんを', 'hon o', 'book (object)']],
  },
  {
    title: 'ん before b, p, m',
    text: 'ん sounds like "m" before b, p and m sounds.',
    examples: [['しんぶん', 'shinbun', 'newspaper'], ['さんぽ', 'sanpo', 'a walk'], ['えんぴつ', 'enpitsu', 'pencil']],
  },
]

function Rules() {
  const { speak } = useKanaSpeaker()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {RULES.map((r) => (
        <section key={r.title} className={`${ui.card} p-5`}>
          <h2 className="font-bold">{r.title}</h2>
          <p className="mt-1 text-sm text-muted">{r.text}</p>
          <ul className="mt-3 space-y-1">
            {r.examples.map(([jp, romaji, en]) => (
              <li key={jp} className="flex items-baseline gap-3">
                <button onClick={() => speak?.(jp)} disabled={!speak} className="text-xl hover:text-accent disabled:hover:text-ink" title={speak ? 'Play' : 'No Japanese voice installed'}>
                  {jp}
                </button>
                <span className="text-sm">{romaji}</span>
                <span className="text-sm text-muted">{en}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

// ---------- Refresh test ----------

function Refresh({ script }) {
  const [phase, setPhase] = useState('intro') // intro | test | result | drill
  const [items, setItems] = useState([])
  const [i, setI] = useState(0)
  const [results, setResults] = useState([])
  const [flash, setFlash] = useState(null)
  const shownAt = useRef(0)
  const inputRef = useRef(null)
  const record = useRecordKana()

  const start = () => {
    setItems(shuffle(BASIC))
    setI(0)
    setResults([])
    setPhase('test')
  }
  useEffect(() => {
    shownAt.current = Date.now()
  }, [i, phase])

  const submit = (value) => {
    const kana = items[i]
    const ms = Date.now() - shownAt.current
    const correct = romajiMatches(value, kana)
    const res = { script, key: kana.key, correct, fast: correct && ms < FAST_MS, durationMs: ms }
    const all = [...results, res]
    setResults(all)
    inputRef.current?.clear()
    if (!correct) setFlash(`${kana[script]} = ${kana.romaji}`)
    else setFlash(null)
    if (i + 1 >= items.length) {
      record.mutate({ results: all, mode: 'lesson' })
      setPhase('result')
    } else setI(i + 1)
  }

  if (phase === 'intro') {
    return (
      <div className={`${ui.card} max-w-xl p-6`}>
        <h2 className="font-bold">Quick test of all {BASIC.length} basic {script === 'hira' ? 'hiragana' : 'katakana'}</h2>
        <p className="mt-2 text-sm text-muted">
          Type the romaji for each character. Correct within 3 seconds = mastered (reviewed again in about a week). Slow or wrong
          ones are scheduled for practice.
        </p>
        <button className={`${ui.primary} mt-4`} onClick={start}>
          Start test
        </button>
      </div>
    )
  }

  if (phase === 'test') {
    const kana = items[i]
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-sm text-muted tabular-nums">
          {i + 1} / {items.length}
        </p>
        <div className={`${ui.card} mt-3 p-8`}>
          <div className="text-8xl leading-none">{kana[script]}</div>
          <div className="mt-6">
            <KanaInput ref={inputRef} romaji placeholder="romaji + Enter" onSubmit={submit} />
          </div>
          <p className="mt-2 min-h-5 text-sm text-red-600" role="status">
            {flash}
          </p>
        </div>
      </div>
    )
  }

  const mastered = results.filter((r) => r.fast)
  const slow = results.filter((r) => r.correct && !r.fast)
  const missed = results.filter((r) => !r.correct)
  const char = (r) => ALL_KANA.find((k) => k.key === r.key)[script]

  if (phase === 'drill') return <Drill items={[...missed, ...slow].map((r) => ALL_KANA.find((k) => k.key === r.key))} script={script} onDone={() => setPhase('result')} />

  return (
    <div className="max-w-xl space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Tile label="Mastered" value={mastered.length} />
        <Tile label="Slow" value={slow.length} />
        <Tile label="Missed" value={missed.length} />
      </div>
      {missed.length > 0 && <p className="text-2xl">Missed: {missed.map(char).join(' ')}</p>}
      {slow.length > 0 && <p className="text-xl text-muted">Slow: {slow.map(char).join(' ')}</p>}
      {record.isError && <p className="text-sm text-red-600">{errorMessage(record.error)}</p>}
      <p className="text-sm text-muted">All results are saved: mastered characters come back in reviews much later, the rest sooner.</p>
      <div className="flex gap-2">
        {missed.length + slow.length > 0 && (
          <button className={ui.primary} onClick={() => setPhase('drill')}>
            Practice the {missed.length + slow.length} weak ones now
          </button>
        )}
        <button className={ui.secondary} onClick={start}>
          Test again
        </button>
      </div>
    </div>
  )
}

// Repeats the weak characters until each is answered correctly once.
function Drill({ items, script, onDone }) {
  const [queue, setQueue] = useState(() => shuffle(items))
  const [feedback, setFeedback] = useState(null)
  const inputRef = useRef(null)
  const { play } = useKanaSpeaker()
  if (queue.length === 0) {
    return (
      <div className={`${ui.card} mx-auto max-w-sm p-8 text-center`}>
        <p className="font-bold">All weak characters answered correctly.</p>
        <button autoFocus className={`${ui.primary} mt-4`} onClick={onDone}>
          Back to results
        </button>
      </div>
    )
  }
  const kana = queue[0]
  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="text-sm text-muted">{queue.length} left</p>
      <div className={`${ui.card} mt-3 p-8`}>
        <div className="text-8xl leading-none">{kana[script]}</div>
        <div className="mt-6">
          <KanaInput
            ref={inputRef}
            romaji
            placeholder="romaji + Enter"
            onSubmit={(v) => {
              inputRef.current?.clear()
              play(kana)
              if (romajiMatches(v, kana)) {
                setFeedback(null)
                setQueue((q) => q.slice(1))
              } else {
                setFeedback(`${kana[script]} = ${kana.romaji}`)
                setQueue((q) => [...q.slice(1), q[0]])
              }
            }}
          />
        </div>
        <p className="mt-2 min-h-5 text-sm text-red-600">{feedback}</p>
      </div>
    </div>
  )
}

function Tile({ label, value }) {
  return (
    <div className={`${ui.card} p-4`}>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  )
}
