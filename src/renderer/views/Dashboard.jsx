import { Link } from 'react-router'
import { ui } from '../components/ui.js'
import { useAppSettings, useStats } from '../queries/app.js'
import { useKanaProgress } from '../queries/practice.js'
import { useReviewStats } from '../queries/review.js'
import { useTexts } from '../queries/texts.js'

export default function Dashboard() {
  const { data: settings } = useAppSettings()
  const { data: review } = useReviewStats()
  const { data: stats } = useStats()
  const { data: texts = [] } = useTexts()
  const { data: kana = {} } = useKanaProgress()
  const toReview = review ? review.due + review.newToday : 0
  const kanaStarted = Object.keys(kana).length > 0
  const kanaFirst = ['beginner', 'forgot-kana'].includes(settings?.level) && !kanaStarted

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className={ui.h1}>Dashboard</h1>

      {kanaFirst && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-accent bg-panel p-5">
          <div>
            <div className="font-bold">{settings.level === 'beginner' ? 'Start with hiragana' : 'Refresh your kana'}</div>
            <p className="text-sm text-muted">
              {settings.level === 'beginner'
                ? 'Learn five characters at a time with sound and stroke order, then a short quiz.'
                : 'A quick test of every character. Only the ones you miss go into practice.'}
            </p>
          </div>
          <Link to={settings.level === 'beginner' ? '/kana?tab=learn' : '/kana?tab=refresh'} className={ui.primary}>
            Start
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="To review today" value={review ? toReview : '—'} hint={review && `${review.due} due · ${review.newToday} new`} />
        <Stat label="Reviewed today" value={review?.reviewedToday ?? '—'} hint={stats && `${stats.streak}-day streak`} />
        <Stat label="Learning" value={stats?.words.learning ?? '—'} hint="words" />
        <Stat label="Known" value={stats?.words.known ?? '—'} hint="words" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/review" className={toReview > 0 ? ui.primary : ui.secondary}>
          {toReview > 0 ? `Review ${toReview} cards` : 'Review'}
        </Link>
        <Link to="/reader" className={toReview > 0 ? ui.secondary : ui.primary}>
          Read a new text
        </Link>
        <Link to="/practice" className={ui.secondary}>
          Practice
        </Link>
        <Link to="/kana" className={ui.secondary}>
          Kana
        </Link>
      </div>

      <h2 className="mt-10 font-bold">Continue reading</h2>
      {texts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Paste lyrics, an article or open a subtitle file in the <Link to="/reader" className="text-accent underline">Reader</Link>. Words you don't know are highlighted.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel">
          {texts.slice(0, 5).map((t) => (
            <li key={t.id}>
              <Link to={`/reader/${t.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-accent-soft">
                <span className="truncate font-medium">{t.title}</span>
                <span className="shrink-0 text-xs text-muted">{new Date(t.lastOpenedAt ?? t.createdAt).toLocaleDateString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className={`${ui.card} p-4`}>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  )
}
