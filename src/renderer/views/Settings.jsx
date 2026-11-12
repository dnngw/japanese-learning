import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ui } from '../components/ui.js'
import { errorMessage } from '../lib/errors.js'
import {
  useAppInfo,
  useAppSettings,
  useDataAction,
  useFsrsStatus,
  useOnboardingWordCount,
  useOptimizeFsrs,
  useRemoveOnboardingWords,
  useResetFsrs,
  useRestartOnboarding,
  useUpdateSettings,
} from '../queries/app.js'

const LEVEL_LABEL = {
  beginner: "Can't read kana yet",
  'forgot-kana': 'Forgot some kana',
  kana: 'Can read kana',
  N5: 'Knows N5 words',
  N4: 'Knows N4 words',
  N3: 'Knows N3 words',
  N2: 'Knows N2 words',
}

export default function Settings() {
  const { data: settings } = useAppSettings()
  if (!settings) return <p className="p-8 text-muted">Loading…</p>
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className={ui.h1}>Settings</h1>
      <StudySection key={settings.newCardsPerDay} settings={settings} />
      <LevelSection settings={settings} />
      <SchedulerSection />
      <DataSection />
    </div>
  )
}

function Section({ title, children, description }) {
  return (
    <section className={`${ui.card} p-6`}>
      <h2 className="font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function StudySection({ settings }) {
  const update = useUpdateSettings()
  const [perDay, setPerDay] = useState(String(settings.newCardsPerDay))
  const commitPerDay = () => {
    const n = Math.max(0, Math.min(200, Math.round(Number(perDay))))
    if (Number.isFinite(n) && n !== settings.newCardsPerDay) update.mutate({ newCardsPerDay: n })
    else setPerDay(String(settings.newCardsPerDay))
  }
  return (
    <Section title="Daily study">
      <Row label="New cards per day" hint="How many saved words are introduced in reviews each day.">
        <input
          type="number"
          min="0"
          max="200"
          value={perDay}
          onChange={(e) => setPerDay(e.target.value)}
          onBlur={commitPerDay}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`${ui.input} w-24 py-1 text-right`}
          aria-label="New cards per day"
        />
      </Row>
      <Row label="Target retention" hint="Higher means you remember more, but review more often.">
        <select
          value={settings.desiredRetention}
          onChange={(e) => update.mutate({ desiredRetention: Number(e.target.value) })}
          className={`${ui.input} py-1`}
          aria-label="Target retention"
        >
          {[0.8, 0.85, 0.9, 0.95].map((r) => (
            <option key={r} value={r}>
              {Math.round(r * 100)}%{r === 0.9 ? ' (recommended)' : ''}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Practice counts as review" hint="Quiz results update the schedule, at most once per word per day.">
        <input
          type="checkbox"
          className="size-5"
          checked={settings.practiceAffectsSchedule}
          onChange={(e) => update.mutate({ practiceAffectsSchedule: e.target.checked })}
          aria-label="Practice counts as review"
        />
      </Row>
      {update.isError && <p className="text-sm text-red-600">{errorMessage(update.error)}</p>}
    </Section>
  )
}

function LevelSection({ settings }) {
  const navigate = useNavigate()
  const restart = useRestartOnboarding()
  const count = useOnboardingWordCount()
  const remove = useRemoveOnboardingWords()
  return (
    <Section title="Level">
      <Row label={`Current level: ${LEVEL_LABEL[settings.level] ?? 'not set'}`} hint="Run the first-start setup again to change it.">
        <button className={ui.secondary} onClick={() => restart.mutate(undefined, { onSuccess: () => navigate('/welcome') })}>
          Run setup again
        </button>
      </Row>
      {count.data > 0 && (
        <Row label={`${count.data.toLocaleString()} words were marked known during setup`} hint="Remove them if too many words are hidden in the reader. Words you saved yourself are kept.">
          <button
            className={ui.secondary}
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Remove ${count.data} words marked known during setup?`)) remove.mutate()
            }}
          >
            Remove
          </button>
        </Row>
      )}
    </Section>
  )
}

function SchedulerSection() {
  const status = useFsrsStatus().data
  const optimize = useOptimizeFsrs()
  const reset = useResetFsrs()
  if (!status) return null
  const enough = status.available && status.reviews >= status.minReviews
  return (
    <Section
      title="Review scheduler (FSRS)"
      description="FSRS predicts when you are about to forget a word. With enough history it can learn your own memory patterns."
    >
      <Row
        label={status.custom ? `Personalized (optimized ${new Date(status.optimizedAt).toLocaleDateString()} from ${status.optimizedReviews} reviews)` : 'Using default parameters'}
        hint={
          !status.available
            ? 'The optimizer is not available on this system; default parameters work well.'
            : enough
              ? `${status.reviews} reviews in your history.`
              : `Optimization becomes available at ${status.minReviews} reviews (you have ${status.reviews}).`
        }
      >
        <div className="flex gap-2">
          {status.custom && (
            <button className={ui.ghost} disabled={reset.isPending} onClick={() => reset.mutate()}>
              Reset
            </button>
          )}
          <button className={ui.secondary} disabled={!enough || optimize.isPending} onClick={() => optimize.mutate()}>
            {optimize.isPending ? 'Optimizing…' : 'Optimize'}
          </button>
        </div>
      </Row>
      {optimize.data && (
        <p className="text-sm" role="status">
          {optimize.data.improved
            ? `Done: new parameters fit your history better (log loss ${optimize.data.before.toFixed(3)} → ${optimize.data.after.toFixed(3)}).`
            : 'Your current parameters already fit your history best; nothing was changed.'}
        </p>
      )}
      {optimize.isError && <p className="text-sm text-red-600">{errorMessage(optimize.error)}</p>}
    </Section>
  )
}

function DataSection() {
  const { data: info } = useAppInfo()
  const csv = useDataAction('exportCsv')
  const anki = useDataAction('exportApkg')
  const json = useDataAction('exportJson')
  const db = useDataAction('backupDb')
  const restore = useDataAction('restoreJson')
  const busy = [csv, anki, json, db, restore].some((a) => a.isPending)
  // Message for the most recent action only (null result = dialog cancelled).
  const [message, setMessage] = useState(null)
  const run = (action, payload, describe) => {
    setMessage(null)
    action.mutate(payload, {
      onSuccess: (res) => res && setMessage({ text: describe(res) }),
      onError: (err) => setMessage({ error: errorMessage(err) }),
    })
  }
  const saved = (res) => `Saved ${res.count != null ? `${res.count} words ` : ''}to ${res.file}`

  return (
    <Section title="Your data" description="Everything is stored on this computer. Export it any time; nothing is locked in.">
      <Row label="Export words as CSV" hint="Learning and known words with reading, meaning, sentence and notes.">
        <button className={ui.secondary} disabled={busy} onClick={() => run(csv, { statuses: ['learning', 'known'] }, saved)}>
          Export CSV
        </button>
      </Row>
      <Row label="Export to Anki (.apkg)" hint="A deck with word, reading, meaning and your sentence. Scheduling starts fresh in Anki.">
        <div className="flex gap-2">
          <button className={ui.secondary} disabled={busy} onClick={() => run(anki, { statuses: ['learning'] }, saved)}>
            Learning words
          </button>
          <button className={ui.secondary} disabled={busy} onClick={() => run(anki, { statuses: ['learning', 'known'] }, saved)}>
            All words
          </button>
        </div>
      </Row>
      <Row label="Full backup" hint="All texts, words, review history and settings in one file you can restore.">
        <div className="flex gap-2">
          <button className={ui.secondary} disabled={busy} onClick={() => run(json, undefined, saved)}>
            Backup (.json)
          </button>
          <button className={ui.ghost} disabled={busy} onClick={() => run(db, undefined, saved)}>
            Copy database
          </button>
        </div>
      </Row>
      <Row label="Restore from backup" hint="Replaces ALL current data with the backup file.">
        <button
          className={ui.secondary}
          disabled={busy}
          onClick={() => {
            if (window.confirm('Restoring replaces all your current texts, words and review history. Continue?'))
              run(restore, undefined, (res) => `Restored ${res.counts.words} words and ${res.counts.texts} texts from ${res.file}`)
          }}
        >
          Restore…
        </button>
      </Row>
      <div role="status" className="text-sm">
        {message?.text && <p className="text-accent">{message.text}</p>}
        {message?.error && <p className="text-red-600">{message.error}</p>}
      </div>
      {info?.dictionary && (
        <p className="border-t border-line pt-4 text-xs text-muted">
          Dictionary: JMdict {info.dictionary.jmdictDate} ({info.dictionary.license}). New app releases include the latest dictionary.
        </p>
      )}
    </Section>
  )
}
