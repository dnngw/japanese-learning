import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { furiganaForWord } from '../src/main/services/furiganaService.js'
import { score } from '../src/main/services/scoringService.js'
import { initTokenizer, tokenize } from '../src/main/services/tokenizerService.js'
import { groupTokens } from '../src/main/services/wordGroupingService.js'

const words = async (text) => groupTokens(await tokenize(text))
const show = (segs) => segs.map((s) => (s.rt ? `${s.text}[${s.rt}]` : s.text)).join('')

beforeAll(async () => {
  await initTokenizer(path.resolve('node_modules/kuromoji/dict'))
}, 30_000)

describe('word grouping (real kuromoji)', () => {
  it('keeps conjugated verbs as one word with the dictionary form as lemma', async () => {
    const ws = await words('昨日すしを食べました')
    expect(ws.map((w) => w.surface)).toEqual(['昨日', 'すし', 'を', '食べました'])
    expect(ws.at(-1).lemma).toBe('食べる')
  })

  it('merges different forms of the same verb to one lemma', async () => {
    for (const text of ['食べた', '食べます', '食べない', '食べている']) {
      const ws = await words(text)
      expect(ws).toHaveLength(1)
      expect(ws[0].lemma).toBe('食べる')
    }
  })

  it('attaches そう ("looks like") to the verb or adjective', async () => {
    expect((await words('雨が降りそうだね')).map((w) => w.surface)).toEqual(['雨', 'が', '降りそうだ', 'ね'])
    expect((await words('美味しそうです'))[0]).toMatchObject({ surface: '美味しそうです', lemma: '美味しい' })
  })

  it('keeps adjectives together', async () => {
    const ws = await words('高くない')
    expect(ws).toHaveLength(1)
    expect(ws[0].lemma).toBe('高い')
  })

  it('produces per-kanji furigana for a conjugated verb', async () => {
    const [w] = await words('読んでいる')
    expect(show(furiganaForWord(w))).toBe('読[よ]んでいる')
  })
})

describe('comprehension score', () => {
  it('ignores particles and counts known words', async () => {
    const ws = await words('私は毎日日本語を勉強します')
    const known = new Set(['私', '毎日'])
    const s = score(ws, (w) => (known.has(w.lemma) ? 'known' : null))
    // Counted: 私, 毎日, 日本語, 勉強, します  (は and を are skipped)
    expect(s.total).toBe(5)
    expect(s.known).toBe(2)
    expect(s.percent).toBe(40)
    expect(s.topUnknown.map((u) => u.lemma)).toContain('日本語')
  })

  it('does not count the nominalizer の as a word', async () => {
    const ws = await words('覚えるのは楽しい')
    const s = score(ws, () => null)
    expect(s.topUnknown.map((u) => u.lemma)).toEqual(['覚える', '楽しい'])
  })
})
