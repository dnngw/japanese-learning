import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ui } from '../components/ui.js'
import { errorMessage } from '../lib/errors.js'
import { useAppInfo, useCompleteOnboarding } from '../queries/app.js'

const LEVELS = [
  { id: 'beginner', title: "I can't read kana yet", text: 'Start with hiragana and katakana: sounds, stroke order and quizzes.' },
  { id: 'forgot-kana', title: 'I learned kana but forgot some', text: 'Take a quick test. Only the characters you miss go into practice.' },
  { id: 'kana', title: 'I can read kana', text: 'Go straight to reading. Every word starts as new.' },
  { id: 'N5', title: 'I know most N5 words', text: 'About 700 basic words are marked as known.', marks: true },
  { id: 'N4', title: 'I know most N4 words', text: 'N5 and N4 words (about 1,350) are marked as known.', marks: true },
  { id: 'N3', title: 'I know most N3 words', text: 'N5–N3 words (about 3,000) are marked as known.', marks: true },
  { id: 'N2', title: 'I know most N2 words', text: 'N5–N2 words (about 4,700) are marked as known.', marks: true },
]

export default function Welcome() {
  const navigate = useNavigate()
  const { data: info } = useAppInfo()
  const complete = useCompleteOnboarding()
  const [level, setLevel] = useState(null)
  const [perDay, setPerDay] = useState(15)
  const [markKnown, setMarkKnown] = useState(true)
  const chosen = LEVELS.find((l) => l.id === level)
  const dictionaryReady = info?.dictionary != null

  const finish = () =>
    complete.mutate(
      { level, newCardsPerDay: perDay, markKnown: !!chosen?.marks && markKnown },
      { onSuccess: (res) => navigate(res.next, { replace: true }) },
    )

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Welcome to JapanLearn</h1>
      <p className="mt-2 text-muted">
        Read real Japanese, save the words you don't know, and review them in the sentences you found them in.
        Everything stays on your computer.
      </p>

      <h2 className="mt-8 font-bold">1. Where are you now?</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={level === l.id}
            onClick={() => setLevel(l.id)}
            className={`rounded-xl border p-4 text-left ${level === l.id ? 'border-accent bg-accent-soft' : 'border-line bg-panel hover:border-accent'}`}
          >
            <div className="font-medium">{l.title}</div>
            <div className="mt-1 text-sm text-muted">{l.text}</div>
          </button>
        ))}
      </div>

      <h2 className="mt-8 font-bold">2. How many new words per day?</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {[5, 10, 15, 20, 30].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPerDay(n)}
            className={`rounded-lg border px-4 py-2 text-sm ${perDay === n ? 'border-accent bg-accent-soft font-medium' : 'border-line bg-panel'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">New words you save are introduced in reviews at this pace. You can change it later in Settings.</p>

      {chosen?.marks && (
        <label className="mt-6 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={markKnown && dictionaryReady} disabled={!dictionaryReady} onChange={(e) => setMarkKnown(e.target.checked)} />
          <span>
            Mark these words as known so the reader doesn't highlight them.
            <span className="block text-muted">
              {dictionaryReady ? 'You can undo this in Settings.' : 'Needs the dictionary (run npm run dict:build).'} JLPT lists are unofficial estimates.
            </span>
          </span>
        </label>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button type="button" className={ui.primary} disabled={!level || complete.isPending} onClick={finish}>
          {complete.isPending ? 'Setting up…' : 'Start'}
        </button>
        {complete.isError && <span className="text-sm text-red-600">{errorMessage(complete.error)}</span>}
      </div>
    </div>
  )
}
