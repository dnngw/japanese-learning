import { toHiragana } from 'wanakana'

const KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/

// Returns ruby segments for one token: [{ text, rt? }].
//
// Three layers:
//   1. lookup(surface, reading) from JmdictFurigana (handles 日本語 → 日/本/語),
//   2. okurigana alignment (食べた → 食[た]べた, 引き出し → 引[ひ]き出[だ]し),
//   3. ruby over the whole word (今日 → 今日[きょう]).
export function furigana(surface, readingKatakana, lookup = null) {
  if (!KANJI.test(surface) || !readingKatakana) return [{ text: surface }]
  const reading = toHiragana(readingKatakana, { passRomaji: true })

  const fromDict = lookup?.(surface, reading)
  if (fromDict) return fromDict

  return alignOkurigana(surface, reading) ?? [{ text: surface, rt: reading }]
}

export function alignOkurigana(surface, reading) {
  const runs = []
  for (const ch of surface) {
    const isKanji = KANJI.test(ch)
    const last = runs.at(-1)
    if (last && last.isKanji === isKanji) last.text += ch
    else runs.push({ text: ch, isKanji })
  }
  const pattern = runs.map((r) => (r.isKanji ? '(.+?)' : escapeRegex(toHiragana(r.text, { passRomaji: true })))).join('')
  const match = new RegExp(`^${pattern}$`).exec(reading)
  if (!match) return null
  let i = 1
  return runs.map((r) => (r.isKanji ? { text: r.text, rt: match[i++] } : { text: r.text }))
}

// Furigana for a whole grouped word (one entry per kuromoji token, merged).
export function furiganaForWord(word, lookup = null) {
  return word.tokens.flatMap((t) => furigana(t.surface, t.reading, lookup))
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
