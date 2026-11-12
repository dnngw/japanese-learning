import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs'
import { parseKanaCardKey } from '../../shared/kana.js'
import * as cardModel from '../models/cardModel.js'
import { getDb } from '../models/db.js'
import * as reviewLogModel from '../models/reviewLogModel.js'
import * as dictionary from './dictionaryService.js'
import * as settings from './settingsService.js'

// A word whose card stability reaches this many days counts as "known" in the reader.
export const MATURE_STABILITY_DAYS = 21
const DAY_STARTS_AT_HOUR = 4 // late-night reviews still count for "today"
const LEARN_AHEAD_MS = 20 * 60 * 1000
const WORD_CARD = 'meaning'

// Scheduler follows the user's settings (retention, optimized weights).
let scheduler = null
settings.onChange(() => {
  scheduler = null
})
function getScheduler() {
  if (!scheduler) {
    const s = settings.get()
    scheduler = fsrs(
      generatorParameters({
        enable_fuzz: true,
        request_retention: s.desiredRetention,
        ...(s.fsrsParams ? { w: s.fsrsParams } : {}),
      }),
    )
  }
  return scheduler
}

// ---- ts-fsrs <-> database rows ----

export const toFsrs = (row) => ({
  due: row.due,
  stability: row.stability,
  difficulty: row.difficulty,
  scheduled_days: row.scheduledDays,
  learning_steps: row.learningSteps,
  reps: row.reps,
  lapses: row.lapses,
  state: row.state,
  last_review: row.lastReview ?? undefined,
})

const fromFsrs = (c) => ({
  due: c.due,
  stability: c.stability,
  difficulty: c.difficulty,
  scheduledDays: c.scheduled_days,
  learningSteps: c.learning_steps,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  lastReview: c.last_review ?? null,
})

export function dayStart(now = new Date()) {
  const d = new Date(now)
  if (d.getHours() < DAY_STARTS_AT_HOUR) d.setDate(d.getDate() - 1)
  d.setHours(DAY_STARTS_AT_HOUR, 0, 0, 0)
  return d
}

export function formatInterval(ms) {
  const min = ms / 60_000
  if (min < 1) return '<1m'
  if (min < 60) return `${Math.round(min)}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)}d`
  if (d < 365) return `${Math.round(d / 30)}mo`
  return `${(d / 365).toFixed(1)}y`
}

// ---- cards ----

export function ensureCardForWord(wordId, now = new Date()) {
  return cardModel.insertIfMissing({ wordId, type: WORD_CARD, ...fromFsrs(createEmptyCard(now)) })
}

export function ensureCardForKana(kanaKey, now = new Date()) {
  return cardModel.insertIfMissing({ kanaKey, type: 'kana', ...fromFsrs(createEmptyCard(now)) })
}

function backfillCards(now) {
  for (const wordId of cardModel.learningWordsWithoutCard(WORD_CARD)) ensureCardForWord(wordId, now)
}

function meaningFor(word) {
  if (word.customMeaning) return [word.customMeaning]
  if (!word.jmdictId) return []
  const entry = dictionary.entryForDisplay(word.jmdictId)
  return entry ? entry.senses.slice(0, 3).map((s) => s.gloss.join('; ')) : []
}

function toQueueItem({ card, word }, now) {
  const outcomes = getScheduler().repeat(toFsrs(card), now)
  const base = {
    cardId: card.id,
    state: card.state,
    intervals: Object.fromEntries(
      [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((r) => [r, formatInterval(outcomes[r].card.due - now)]),
    ),
  }
  if (card.type === 'kana') {
    return { ...base, kind: 'kana', kana: parseKanaCardKey(card.kanaKey) }
  }
  const context = cardModel.latestContext(word.id)
  return {
    ...base,
    kind: 'word',
    word: { id: word.id, lemma: word.lemma, reading: word.reading, jmdictId: word.jmdictId },
    meanings: meaningFor(word),
    context: context ? { sentence: context.sentence, surface: context.surface } : null,
  }
}

function newLeftToday(now) {
  return Math.max(0, settings.get().newCardsPerDay - reviewLogModel.countNewSince(dayStart(now)))
}

export function getQueue(now = new Date()) {
  backfillCards(now)
  const started = cardModel.dueStarted(now, LEARN_AHEAD_MS)
  return [...started, ...cardModel.newCards(newLeftToday(now))].map((row) => toQueueItem(row, now))
}

export function getStats(now = new Date()) {
  backfillCards(now)
  return {
    due: cardModel.countDueStarted(now, LEARN_AHEAD_MS),
    newToday: Math.min(newLeftToday(now), cardModel.countNew()),
    reviewedToday: reviewLogModel.countSince(dayStart(now)),
  }
}

// Records an answer. source: 'review' (review screen) or 'practice' (quizzes, kana lessons).
export function answer({ cardId, rating, durationMs, source = 'review' }, now = new Date()) {
  const row = cardModel.getById(cardId)
  if (!row) throw new Error(`Card ${cardId} not found`)
  const { card, log } = getScheduler().next(toFsrs(row), now, rating)
  getDb().transaction(() => {
    cardModel.update(cardId, fromFsrs(card))
    reviewLogModel.insert({
      cardId,
      rating: log.rating,
      state: log.state,
      due: log.due,
      stability: log.stability,
      difficulty: log.difficulty,
      scheduledDays: log.scheduled_days,
      learningSteps: log.learning_steps,
      reviewedAt: now,
      durationMs: durationMs ?? null,
      source,
    })
  })
  return { due: card.due, state: card.state }
}

// A practice result counts toward the schedule only when the user enabled it,
// and at most once per card per day (so drilling doesn't inflate intervals).
export function recordPractice({ cardId, correct, durationMs }, now = new Date()) {
  if (!settings.get().practiceAffectsSchedule) return false
  const row = cardModel.getById(cardId)
  if (!row || (row.lastReview && row.lastReview >= dayStart(now))) return false
  answer({ cardId, rating: correct ? Rating.Good : Rating.Again, durationMs, source: 'practice' }, now)
  return true
}
