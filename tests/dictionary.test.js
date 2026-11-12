import { existsSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { openDictionary } from '../src/main/models/dictionaryModel.js'
import * as dictionary from '../src/main/services/dictionaryService.js'
import { furiganaForWord } from '../src/main/services/furiganaService.js'
import { estimateJlpt, isCounted } from '../src/main/services/scoringService.js'
import { initTokenizer, tokenize } from '../src/main/services/tokenizerService.js'
import { groupTokens } from '../src/main/services/wordGroupingService.js'

const DICT = path.resolve('resources/dict.db')
const words = async (text) => groupTokens(await tokenize(text))
const show = (segs) => segs.map((s) => (s.rt ? `${s.text}[${s.rt}]` : s.text)).join('')
const find = async (text, surface) => {
  const w = (await words(text)).find((x) => x.surface === surface)
  return { word: w, entry: dictionary.findEntry(w) }
}

// Needs resources/dict.db: run `npm run dict:build` first.
describe.skipIf(!existsSync(DICT))('dictionary (real dict.db)', () => {
  beforeAll(async () => {
    openDictionary(DICT)
    await initTokenizer(path.resolve('node_modules/kuromoji/dict'))
  }, 30_000)

  it('derives the dictionary-form reading', async () => {
    expect(dictionary.dictionaryReading((await find('食べました', '食べました')).word)).toBe('たべる')
    expect(dictionary.dictionaryReading((await find('読んでいる', '読んでいる')).word)).toBe('よむ')
  })

  it('finds the right JMdict entry for conjugated words', async () => {
    const { entry } = await find('昨日すしを食べました', '食べました')
    expect(entry.id).toBe(1358280) // 食べる "to eat"
    expect(entry.jlpt).toBe(5)
    expect(entry.senses[0].gloss).toContain('to eat')

    const yomu = (await find('本を読んでいる', '読んでいる')).entry
    expect(yomu.kanji.map((k) => k.text)).toContain('読む')
    expect(yomu.senses[0].gloss.join(' ')).toMatch(/read/)
  })

  it('picks the reading-matched entry for homographs', async () => {
    // 今日 is きょう here, not こんにち ("these days")
    const { entry } = await find('今日は晴れです', '今日')
    expect(entry.kana.map((k) => k.text)).toContain('きょう')
    expect(entry.senses[0].gloss.join(' ')).toMatch(/today/)
  })

  it('splits compound furigana using JmdictFurigana', async () => {
    const [w] = await words('日本語')
    expect(show(furiganaForWord(w, dictionary.furiganaLookup))).toBe('日本[にほん]語[ご]')
  })

  it('expands tag codes for display', () => {
    const e = dictionary.entryForDisplay(1358280)
    expect(e.jlpt).toBe('N5')
    expect(e.senses[0].pos.join(' ')).toMatch(/Ichidan verb/)
  })

  it('estimates the JLPT level of a simple text', async () => {
    const ws = (await words('私は毎日学校に行きます。友達と昼ご飯を食べます。それから図書館で本を読みます。')).filter(isCounted)
    for (const w of ws) {
      const e = dictionary.findEntry(w)
      w.jmdictId = e?.id ?? null
      w.jlpt = e?.jlpt ?? null
    }
    expect(['N5', 'N4']).toContain(estimateJlpt(ws))
  })
})
