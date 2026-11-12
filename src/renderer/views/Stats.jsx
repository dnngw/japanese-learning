import BarChart from '../components/BarChart.jsx'
import { ui } from '../components/ui.js'
import { errorMessage } from '../lib/errors.js'
import { percent } from '../lib/format.js'
import { useStats } from '../queries/app.js'

const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function Stats() {
  const { data: s, isError, error } = useStats()
  if (isError) return <p className="p-8 text-red-600">{errorMessage(error)}</p>
  if (!s) return <p className="p-8 text-muted">Loading…</p>

  return (
    <div className={ui.page}>
      <h1 className={ui.h1}>Statistics</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Streak" value={`${s.streak} ${s.streak === 1 ? 'day' : 'days'}`} />
        <Tile label="Reviews (30 days)" value={s.reviews30.toLocaleString()} hint={`${s.reviewsAllTime.toLocaleString()} all time`} />
        <Tile label="Accuracy (30 days)" value={percent(s.accuracy30)} hint="answers not rated Again" />
        <Tile label="Retention" value={percent(s.retention30)} hint="cards already in review" />
        <Tile label="Kana learned" value={s.kanaLearned} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Words learning" value={s.words.learning} />
        <Tile label="Words known" value={s.words.known} />
        <Tile label="New cards" value={s.cards.new} />
        <Tile label="In learning steps" value={s.cards.learning} />
        <Tile label="Mature cards" value={s.cards.mature} hint="stability ≥ 21 days" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BarChart
          title="Reviews per day"
          valueLabel="reviews"
          data={s.days.map((d) => ({ label: d.date, value: d.reviews, extra: d.reviews ? `${Math.round((d.correct / d.reviews) * 100)}% correct` : undefined }))}
          formatLabel={(d) => shortDate(d.label)}
        />
        <BarChart
          title="New words saved per week"
          valueLabel="words"
          data={s.weeks.map((w) => ({ label: w.week, value: w.words }))}
          formatLabel={(d) => `Week of ${shortDate(d.label)}`}
        />
        <BarChart
          title="Reviews due in the next 7 days"
          valueLabel="cards"
          data={s.forecast.map((f) => ({ label: f.date, value: f.due }))}
          formatLabel={(d) => shortDate(d.label)}
        />
      </div>
    </div>
  )
}

function Tile({ label, value, hint }) {
  return (
    <div className={`${ui.card} p-4`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  )
}
