import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as cardModel from '../src/main/models/cardModel.js'
import { openUserDb } from '../src/main/models/db.js'
import { openDictionary } from '../src/main/models/dictionaryModel.js'
import * as wordModel from '../src/main/models/wordModel.js'
import * as kana from '../src/main/services/kanaService.js'
import * as onboarding from '../src/main/services/onboardingService.js'
import * as practice from '../src/main/services/practiceService.js'
import * as reader from '../src/main/services/readerService.js'
import * as review from '../src/main/services/reviewService.js'
import * as settings from '../src/main/services/settingsService.js'
import * as texts from '../src/main/services/textService.js'
import { initTokenizer } from '../src/main/services/tokenizerService.js'
import * as words from '../src/main/services/wordService.js'

const DICT = path.resolve('resources/dict.db')
let dir

describe.skipIf(!existsSync(DICT))('app features (temp user.db + real dict.db)', () => {
  beforeAll(async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-features-'))
    openUserDb(path.join(dir, 'user.db'), path.resolve('drizzle'))
    openDictionary(DICT)
    await initTokenizer(path.resolve('node_modules/kuromoji/dict'))
  }, 30_000)
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('onboarding marks N5 words known, can be undone, and keeps user words', async () => {
    words.save({ jmdictId: 1358280, lemma: '食べる', reading: 'たべる', status: 'learning', surface: '食べた', sentence: '昨日すしを食べた。' })
    const { marked, next } = onboarding.complete({ level: 'N5', newCardsPerDay: 15, markKnown: true })
    expect(marked).toBeGreaterThan(500)
    expect(next).toBe('/reader')
    expect(settings.get()).toMatchObject({ onboarded: true, level: 'N5', newCardsPerDay: 15 })
    // 食べる was already being learned: not overwritten by the bulk marking
    expect(wordModel.findForWords({ jmdictIds: [1358280], lemmas: [] })[0].status).toBe('learning')

    const t = texts.createFromPaste({ content: '私は毎日学校に行きます。' })
    const a = await reader.analyzeText(t.id)
    expect(a.stats.percent).toBeGreaterThan(50) // 私, 毎日, 学校, 行く are N5

    expect(onboarding.removeOnboardingWords()).toBe(marked)
    expect(wordModel.countsByStatus()).toMatchObject({ learning: 1, known: 0 })
  })

  it('imports a subtitle file and attaches timestamps to lines', async () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\n猫が好きです。\n\n2\n00:00:03,000 --> 00:00:04,500\n犬も好きです。\n'
    const t = texts.importFile({ name: 'episode 1.srt', content: srt })
    expect(t).toMatchObject({ title: 'episode 1', kind: 'srt' })
    const a = await reader.analyzeText(t.id)
    expect(a.lines.map((l) => [l.text, l.startMs, l.endMs])).toEqual([
      ['猫が好きです。', 1000, 2000],
      ['犬も好きです。', 3000, 4500],
    ])
    expect(texts.list()[0].id).toBe(t.id) // most recently opened first
  })

  it('respects the new-cards-per-day setting', () => {
    for (const [lemma, id] of [['猫', 1467640], ['犬', 1250670], ['雨', 1171650]]) {
      words.save({ jmdictId: id, lemma, reading: '', status: 'learning', surface: lemma, sentence: `${lemma}です。` })
    }
    settings.update({ newCardsPerDay: 2 })
    expect(review.getQueue().filter((q) => q.state === 0)).toHaveLength(2)
    settings.update({ newCardsPerDay: 20 })
    expect(review.getQueue().filter((q) => q.state === 0).length).toBeGreaterThanOrEqual(4)
  })

  it('builds practice questions for every mode', async () => {
    const meaning = await practice.buildSession({ mode: 'meaning', count: 5 })
    expect(meaning.questions.length).toBeGreaterThan(0)
    for (const q of meaning.questions) {
      expect(q.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(q.choices).size).toBe(q.choices.length)
      expect(q.answerIndex).toBeGreaterThanOrEqual(0)
    }
    const reading = await practice.buildSession({ mode: 'reading', count: 5 })
    expect(reading.questions.find((q) => q.prompt.lemma === '食べる').accept).toContain('たべる')

    const cloze = await practice.buildSession({ mode: 'cloze', count: 5 })
    const c = cloze.questions.find((q) => q.prompt.answerSurface === '食べた')
    expect(c.prompt.before + c.prompt.answerSurface + c.prompt.after).toBe('昨日すしを食べた。')
    expect(c.choices[c.answerIndex]).toBe('食べる')

    const order = await practice.buildSession({ mode: 'order', count: 5 })
    const o = order.questions.find((q) => q.lemma === '食べる')
    expect(o.answer).toEqual(['昨日', 'すしを', '食べた。'])
    expect([...o.chunks].sort()).toEqual([...o.answer].sort())

    const listening = await practice.buildSession({ mode: 'listening', count: 5 })
    expect(listening.questions[0].speak).toBeTruthy()
  })

  it('counts practice toward the schedule only when enabled, once per day', () => {
    const w = wordModel.findForWords({ jmdictIds: [1467640], lemmas: [] })[0]
    expect(practice.record([{ wordId: w.id, correct: true }]).counted).toBe(0)
    settings.update({ practiceAffectsSchedule: true })
    expect(practice.record([{ wordId: w.id, correct: true }]).counted).toBe(1)
    expect(practice.record([{ wordId: w.id, correct: true }]).counted).toBe(0)
    settings.update({ practiceAffectsSchedule: false })
  })

  it('records kana lessons as reviews and reports progress', () => {
    kana.recordResults([
      { script: 'hira', key: 'a', correct: true, fast: true },
      { script: 'hira', key: 'i', correct: false },
    ])
    const p = kana.progress()
    expect(p['hira:a'].state).toBe(2) // Easy → review
    expect(p['hira:i'].state).toBe(1) // Again → learning
    const queue = review.getQueue(new Date(Date.now() + 15 * 60_000))
    expect(queue.some((q) => q.kind === 'kana' && q.kana.char === 'い')).toBe(true)
    expect(cardModel.kanaCards()).toHaveLength(2)
  })

  it('lists, searches and edits words', () => {
    const found = words.list({ search: '猫' })
    expect(found.total).toBe(1)
    const w = found.items[0]
    expect(w.meaning).toMatch(/cat/)
    words.update(w.id, { customMeaning: 'kucing', note: ' my note ' })
    const again = words.list({ search: 'kucing' }).items[0]
    expect(again).toMatchObject({ customMeaning: 'kucing', note: 'my note' })
    expect(words.list({ search: '100%_' }).total).toBe(0) // LIKE wildcards are escaped
  })
})
