import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as cardModel from '../src/main/models/cardModel.js'
import { openUserDb } from '../src/main/models/db.js'
import * as optimizer from '../src/main/services/optimizerService.js'
import * as review from '../src/main/services/reviewService.js'
import * as settings from '../src/main/services/settingsService.js'
import * as words from '../src/main/services/wordService.js'

let dir

beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-opt-'))
  openUserDb(path.join(dir, 'user.db'), path.resolve('drizzle'))
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('FSRS optimizer with a realistic history', () => {
  it('fits parameters from 500+ reviews and keeps scheduling working', async () => {
    // 60 words, each reviewed when due over ~4 months; ~15% of answers forgotten.
    let seed = 42
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const start = new Date(2026, 0, 1, 9).getTime()
    for (let i = 0; i < 60; i++) {
      const w = words.save({ lemma: `語${i}`, reading: '', status: 'learning', surface: '', sentence: '' })
      let card = cardModel.getById(review.ensureCardForWord(w.id, new Date(start)).id)
      let now = new Date(start + i * 3_600_000)
      for (let r = 0; r < 9; r++) {
        const rating = rand() < 0.15 ? 1 : rand() < 0.1 ? 4 : 3
        review.answer({ cardId: card.id, rating, durationMs: 5000 }, now)
        card = cardModel.getById(card.id)
        now = new Date(Math.max(card.due.getTime(), now.getTime() + 60_000))
      }
    }
    const status = await optimizer.status()
    expect(status.reviews).toBe(540)

    const result = await optimizer.optimize()
    expect(result.items).toBeGreaterThan(100)
    expect(Number.isFinite(result.after)).toBe(true)
    if (result.improved) expect(settings.get().fsrsParams).toHaveLength(21)

    // Scheduling still works with whatever parameters are active.
    const queue = review.getQueue(new Date(2026, 6, 1))
    expect(queue.length).toBeGreaterThan(0)
    expect(Object.values(queue[0].intervals).every((s) => typeof s === 'string')).toBe(true)

    optimizer.reset()
    expect(settings.get().fsrsParams).toBeNull()
  }, 60_000)
})
