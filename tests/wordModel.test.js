import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openUserDb } from '../src/main/models/db.js'
import * as wordModel from '../src/main/models/wordModel.js'

let dir

beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-test-'))
  openUserDb(path.join(dir, 'user.db'), path.resolve('drizzle'))
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('wordModel', () => {
  it('saves a word once and keeps every context sentence', () => {
    const a = wordModel.saveWithContext({ lemma: '食べる', reading: '', status: 'learning', surface: '食べた', sentence: '昨日すしを食べた' })
    const b = wordModel.saveWithContext({ lemma: '食べる', reading: '', status: 'learning', surface: '食べます', sentence: '毎朝パンを食べます' })
    expect(b.id).toBe(a.id)

    const [row] = wordModel.list().items
    expect(row.lemma).toBe('食べる')
    expect(row.contexts.map((c) => c.sentence).sort()).toEqual(['昨日すしを食べた', '毎朝パンを食べます'].sort())
  })

  it('updates status and finds words by lemma', () => {
    const [w] = wordModel.findByLemmas(['食べる'])
    wordModel.setStatus(w.id, 'known')
    expect(wordModel.findByLemmas(['食べる'])[0].status).toBe('known')
    expect(wordModel.findByLemmas(['飲む'])).toEqual([])
  })

  it('deletes contexts together with the word', () => {
    const [w] = wordModel.findByLemmas(['食べる'])
    wordModel.remove(w.id)
    expect(wordModel.list()).toEqual({ total: 0, items: [] })
  })
})
