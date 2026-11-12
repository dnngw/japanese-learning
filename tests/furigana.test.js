import { describe, expect, it } from 'vitest'
import { alignOkurigana, furigana } from '../src/main/services/furiganaService.js'

const show = (segs) => segs.map((s) => (s.rt ? `${s.text}[${s.rt}]` : s.text)).join('')

describe('furigana', () => {
  it('leaves kana-only words alone', () => {
    expect(show(furigana('すし', 'スシ'))).toBe('すし')
    expect(show(furigana('ラーメン', 'ラーメン'))).toBe('ラーメン')
  })

  it('strips okurigana', () => {
    expect(show(furigana('食べ', 'タベ'))).toBe('食[た]べ')
    expect(show(furigana('食べる', 'タベル'))).toBe('食[た]べる')
    expect(show(furigana('引き出し', 'ヒキダシ'))).toBe('引[ひ]き出[だ]し')
    expect(show(furigana('お茶', 'オチャ'))).toBe('お茶[ちゃ]')
  })

  it('handles katakana inside the word', () => {
    expect(show(furigana('一ヶ月', 'イッカゲツ'))).toBe('一ヶ月[いっかげつ]')
  })

  it('falls back to ruby over the whole word', () => {
    expect(show(furigana('今日', 'キョウ'))).toBe('今日[きょう]')
    expect(show(furigana('日本語', 'ニホンゴ'))).toBe('日本語[にほんご]')
  })

  it('uses the dictionary lookup first when it has an answer', () => {
    const lookup = (s, r) =>
      s === '日本語' && r === 'にほんご'
        ? [
            { text: '日', rt: 'に' },
            { text: '本', rt: 'ほん' },
            { text: '語', rt: 'ご' },
          ]
        : null
    expect(show(furigana('日本語', 'ニホンゴ', lookup))).toBe('日[に]本[ほん]語[ご]')
  })

  it('returns no furigana when the reading is unknown', () => {
    expect(show(furigana('薔薇', null))).toBe('薔薇')
  })

  it('returns null when okurigana cannot be matched', () => {
    expect(alignOkurigana('食べる', 'のむ')).toBeNull()
  })
})
