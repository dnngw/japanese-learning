import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as cardModel from '../src/main/models/cardModel.js'
import { getDb, openUserDb } from '../src/main/models/db.js'
import { reviewLogs } from '../src/main/models/schema.js'
import * as review from '../src/main/services/reviewService.js'
import * as wordService from '../src/main/services/wordService.js'

let dir
const at = (iso) => new Date(iso)
const save = (lemma, status = 'learning') =>
  wordService.save({ lemma, reading: '', status, surface: lemma, sentence: `${lemma}の文`, jmdictId: null })

beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-review-'))
  openUserDb(path.join(dir, 'user.db'), path.resolve('drizzle'))
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('review (FSRS)', () => {
  it('creates one card when a word is saved to learn, none for known words', () => {
    const w = save('食べる')
    save('食べる') // saving again must not duplicate the card
    save('猫', 'known')
    const queue = review.getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].word.id).toBe(w.id)
    expect(queue[0].context.sentence).toBe('食べるの文')
    expect(Object.keys(queue[0].intervals)).toEqual(['1', '2', '3', '4'])
  })

  it('schedules answers and logs every review', () => {
    const [item] = review.getQueue()
    const now = at('2026-11-12T10:00:00+07:00')
    review.answer({ cardId: item.cardId, rating: 3, durationMs: 4000 }, now) // Good → learning step
    let card = cardModel.getById(item.cardId)
    expect(card.state).toBe(1)
    expect(card.due.getTime()).toBeGreaterThan(now.getTime())

    review.answer({ cardId: item.cardId, rating: 4, durationMs: 2000 }, at('2026-11-12T10:15:00+07:00')) // Easy → review
    card = cardModel.getById(item.cardId)
    expect(card.state).toBe(2)
    expect(card.due.getTime() - now.getTime()).toBeGreaterThan(24 * 3600 * 1000)

    const logs = getDb().select().from(reviewLogs).all()
    expect(logs.map((l) => [l.rating, l.state])).toEqual([
      [3, 0],
      [4, 1],
    ])
    expect(logs[0].durationMs).toBe(4000)
  })

  it('pauses cards of words marked known and resumes them', () => {
    const w = save('走る')
    expect(review.getQueue().some((q) => q.word.id === w.id)).toBe(true)
    wordService.setStatus(w.id, 'known')
    expect(review.getQueue().some((q) => q.word.id === w.id)).toBe(false)
    wordService.setStatus(w.id, 'learning')
    expect(review.getQueue().some((q) => q.word.id === w.id)).toBe(true)
  })

  it('formats intervals and day boundaries', () => {
    expect(review.formatInterval(30_000)).toBe('<1m')
    expect(review.formatInterval(10 * 60_000)).toBe('10m')
    expect(review.formatInterval(3 * 86_400_000)).toBe('3d')
    // 02:00 belongs to the previous day (day starts at 04:00)
    expect(review.dayStart(new Date(2026, 10, 12, 2)).getDate()).toBe(11)
    expect(review.dayStart(new Date(2026, 10, 12, 9)).getDate()).toBe(12)
  })
})
