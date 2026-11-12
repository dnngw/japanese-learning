import { and, eq, gte } from 'drizzle-orm'
import * as cardModel from '../models/cardModel.js'
import { getDb } from '../models/db.js'
import * as reviewLogModel from '../models/reviewLogModel.js'
import { words } from '../models/schema.js'
import * as wordModel from '../models/wordModel.js'
import { dayStart, MATURE_STABILITY_DAYS } from './reviewService.js'

const DAY = 86_400_000
const dayKey = (d) => {
  const s = dayStart(d)
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`
}

function weekStart(d) {
  const s = dayStart(d)
  const day = (s.getDay() + 6) % 7 // Monday = 0
  return new Date(s.getTime() - day * DAY)
}

export function overview(now = new Date()) {
  // Reviews per day, last 30 days (including today).
  const today = dayStart(now)
  const from = new Date(today.getTime() - 29 * DAY)
  const logs = reviewLogModel.since(from)
  const days = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(from.getTime() + i * DAY)
    days.push({ date: dayKey(d), reviews: 0, correct: 0 })
  }
  const byDay = new Map(days.map((d) => [d.date, d]))
  for (const l of logs) {
    const d = byDay.get(dayKey(l.reviewedAt))
    if (!d) continue
    d.reviews++
    if (l.rating > 1) d.correct++
  }

  // New words saved per week, last 12 weeks.
  const firstWeek = new Date(weekStart(now).getTime() - 11 * 7 * DAY)
  const saved = getDb()
    .select({ createdAt: words.createdAt })
    .from(words)
    .where(and(eq(words.source, 'reader'), gte(words.createdAt, firstWeek)))
    .all()
  const weeks = Array.from({ length: 12 }, (_, i) => ({ week: dayKey(new Date(firstWeek.getTime() + i * 7 * DAY)), words: 0 }))
  for (const w of saved) {
    const i = Math.floor((weekStart(w.createdAt) - firstWeek) / (7 * DAY))
    if (weeks[i]) weeks[i].words++
  }

  // Cards: state counts, mature, upcoming load.
  const cards = cardModel.all()
  const byState = [0, 0, 0, 0]
  let mature = 0
  const forecast = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(new Date(today.getTime() + i * DAY)), due: 0 }))
  for (const c of cards) {
    byState[c.state]++
    if (c.stability >= MATURE_STABILITY_DAYS) mature++
    if (c.state !== 0) {
      const i = Math.max(0, Math.floor((dayStart(c.due) - today) / DAY))
      if (i < 7) forecast[i].due++
    }
  }

  // Streak: consecutive days with at least one review, ending today (or yesterday).
  const reviewDays = new Set(logs.map((l) => dayKey(l.reviewedAt)))
  let streak = 0
  let cursor = reviewDays.has(dayKey(now)) ? today : new Date(today.getTime() - DAY)
  while (reviewDays.has(dayKey(cursor)) && streak < 30) {
    streak++
    cursor = new Date(cursor.getTime() - DAY)
  }

  const total30 = logs.length
  const correct30 = logs.filter((l) => l.rating > 1).length
  // Retention: answers on cards that were already in review (not learning steps).
  const matureLogs = logs.filter((l) => l.state === 2)

  return {
    days,
    weeks,
    forecast,
    words: wordModel.countsByStatus(),
    cards: { total: cards.length, new: byState[0], learning: byState[1] + byState[3], review: byState[2], mature },
    accuracy30: total30 ? correct30 / total30 : null,
    retention30: matureLogs.length ? matureLogs.filter((l) => l.rating > 1).length / matureLogs.length : null,
    reviews30: total30,
    reviewsAllTime: reviewLogModel.total(),
    streak,
    kanaLearned: cards.filter((c) => c.type === 'kana' && c.state !== 0).length,
  }
}

