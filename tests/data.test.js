import Database from 'better-sqlite3'
import { unzipSync } from 'fflate'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openUserDb } from '../src/main/models/db.js'
import { openDictionary } from '../src/main/models/dictionaryModel.js'
import * as wordModel from '../src/main/models/wordModel.js'
import * as exportService from '../src/main/services/exportService.js'
import * as optimizer from '../src/main/services/optimizerService.js'
import * as review from '../src/main/services/reviewService.js'
import * as stats from '../src/main/services/statsService.js'
import * as words from '../src/main/services/wordService.js'

const DICT = path.resolve('resources/dict.db')
let dir

describe.skipIf(!existsSync(DICT))('export, backup, stats, optimizer', () => {
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-data-'))
    openUserDb(path.join(dir, 'user.db'), path.resolve('drizzle'))
    openDictionary(DICT)
    words.save({ jmdictId: 1358280, lemma: '食べる', reading: 'たべる', status: 'learning', surface: '食べた', sentence: '昨日すしを "食べた", と言った。' })
    words.save({ jmdictId: 1467640, lemma: '猫', reading: 'ねこ', status: 'known', surface: '猫', sentence: '猫<が>好き' })
  })
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('exports CSV with quoting and a UTF-8 BOM', () => {
    const file = path.join(dir, 'w.csv')
    expect(exportService.exportCsv(file, { statuses: ['learning', 'known'] }).count).toBe(2)
    const text = readFileSync(file, 'utf8')
    expect(text.charCodeAt(0)).toBe(0xfeff)
    expect(text).toContain('"昨日すしを ""食べた"", と言った。"')
    expect(text.split('\r\n')[0]).toBe('﻿word,reading,meaning,sentence,notes,status,jlpt,created_at')
  })

  it('builds a valid Anki package', () => {
    const { data, count } = exportService.buildApkg({ statuses: ['learning', 'known'] })
    expect(count).toBe(2)
    const files = unzipSync(data)
    expect(Object.keys(files).sort()).toEqual(['collection.anki2', 'media'])
    const dbFile = path.join(dir, 'c.anki2')
    writeFileSync(dbFile, files['collection.anki2'])
    const db = new Database(dbFile, { readonly: true })
    const col = db.prepare('SELECT * FROM col').get()
    const models = JSON.parse(col.models)
    const decks = JSON.parse(col.decks)
    const model = Object.values(models)[0]
    expect(model.flds.map((f) => f.name)).toEqual(['Word', 'Reading', 'Meaning', 'Sentence', 'Notes'])
    expect(Object.values(decks).find((d) => d.name === 'JapanLearn').desc).toMatch(/JMdict/)
    const notes = db.prepare('SELECT * FROM notes').all()
    const cards = db.prepare('SELECT * FROM cards').all()
    expect(notes).toHaveLength(2)
    expect(cards.map((c) => c.nid).sort()).toEqual(notes.map((n) => n.id).sort())
    const fields = notes.find((n) => n.sfld === '猫').flds.split('\x1f')
    expect(fields[3]).toBe('<b>猫</b>&lt;が&gt;好き') // HTML escaped, word highlighted
    expect(fields[2]).toMatch(/cat/)
    db.close()
  })

  it('restores a JSON backup exactly (all or nothing)', () => {
    const file = path.join(dir, 'b.json')
    exportService.exportJson(file)
    words.save({ lemma: '犬', reading: 'いぬ', status: 'learning', surface: '犬', sentence: '犬' })
    expect(wordModel.countsByStatus().learning).toBe(2)
    const res = exportService.restoreJson(file)
    expect(res.counts.words).toBe(2)
    expect(wordModel.countsByStatus()).toMatchObject({ learning: 1, known: 1 })
    expect(wordModel.list().items.find((w) => w.lemma === '食べる').createdAt).toBeInstanceOf(Date)

    const bad = path.join(dir, 'bad.json')
    writeFileSync(bad, '{"format":"other"}')
    expect(() => exportService.restoreJson(bad)).toThrow(/not a JapanLearn backup/)
    expect(wordModel.countsByStatus().learning).toBe(1)
  })

  it('backs up the live database file', async () => {
    const file = path.join(dir, 'copy.db')
    await exportService.backupDatabase(file)
    const db = new Database(file, { readonly: true })
    expect(db.prepare('SELECT count(*) n FROM words').get().n).toBe(2)
    db.close()
  })

  it('computes statistics', () => {
    const [item] = review.getQueue()
    review.answer({ cardId: item.cardId, rating: 3 })
    const s = stats.overview()
    expect(s.days).toHaveLength(30)
    expect(s.days.at(-1).reviews).toBe(1)
    expect(s.weeks.at(-1).words).toBe(2)
    expect(s.words).toMatchObject({ learning: 1, known: 1 })
    expect(s.streak).toBe(1)
    expect(s.accuracy30).toBe(1)
  })

  it('turns review history into optimizer training items', async () => {
    const binding = await import('@open-spaced-repetition/binding')
    const t = (d) => new Date(2026, 0, d, 10)
    const logs = [
      { cardId: 1, rating: 3, reviewedAt: t(1) },
      { cardId: 1, rating: 3, reviewedAt: t(1) }, // same day: short-term review
      { cardId: 1, rating: 3, reviewedAt: t(4) },
      { cardId: 1, rating: 1, reviewedAt: t(14) },
      { cardId: 2, rating: 4, reviewedAt: t(2) },
    ]
    const items = optimizer.buildTrainingItems(logs, binding)
    expect(items.map((i) => i.reviews.map((r) => r.deltaT))).toEqual([
      [0, 0, 3],
      [0, 0, 3, 10],
    ])
    await expect(optimizer.optimize()).rejects.toThrow(/at least 400 reviews/)
    expect((await optimizer.status()).available).toBe(true)
  })
})
