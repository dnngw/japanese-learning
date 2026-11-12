import { Rating } from 'ts-fsrs'
import { ALL_KANA, kanaCardKey } from '../../shared/kana.js'
import * as cardModel from '../models/cardModel.js'
import { answer, ensureCardForKana, recordPractice } from './reviewService.js'

// Progress per kana card: { "hira:ka": { state, stability, due, lapses } }
export function progress() {
  return Object.fromEntries(
    cardModel.kanaCards().map((c) => [c.kanaKey, { state: c.state, stability: c.stability, due: c.due, lapses: c.lapses }]),
  )
}

// After a lesson or quiz: results = [{ script, key, correct, fast? }].
// Each kana gets a card (if it has none) and the result is recorded as its review:
// fast + correct → Easy (refresh mode "mastered"), correct → Good, wrong → Again.
// mode 'lesson' (learn a row, refresh test): always recorded, creates cards.
// mode 'quiz': like word practice — only for kana already learned, only when the
// user lets practice count, and at most once per card per day.
export function recordResults(results, mode = 'lesson', now = new Date()) {
  const valid = new Set(ALL_KANA.map((k) => k.key))
  let recorded = 0
  for (const r of results) {
    if (!valid.has(r.key) || !['hira', 'kata'].includes(r.script)) continue
    if (mode === 'quiz') {
      const existing = cardModel.getByKanaKey(kanaCardKey(r.script, r.key))
      if (existing && recordPractice({ cardId: existing.id, correct: r.correct, durationMs: r.durationMs }, now)) recorded++
      continue
    }
    const card = ensureCardForKana(kanaCardKey(r.script, r.key), now)
    // Don't stack several answers for the same card on the same day from lessons.
    if (card.lastReview && now - card.lastReview < 60_000) continue
    const rating = !r.correct ? Rating.Again : r.fast ? Rating.Easy : Rating.Good
    answer({ cardId: card.id, rating, durationMs: r.durationMs ?? null, source: 'practice' }, now)
    recorded++
  }
  return { recorded }
}
