// Comprehension score: share of content words the user already knows.
// Particles, auxiliaries, punctuation, numbers and proper nouns are not counted,
// otherwise every text would look easy.

const SKIP_POS = new Set(['助詞', '助動詞', '記号', 'フィラー', 'その他'])
const SKIP_DETAIL = new Set(['数', '固有名詞'])
const HAS_JAPANESE = /[぀-ヿ㐀-䶿一-鿿々]/

// Grammatical nominalizers (覚えるのは, 行くんです) are grammar, not vocabulary.
const NOMINALIZERS = new Set(['の', 'ん'])

export function isCounted(word) {
  if (SKIP_POS.has(word.pos) || SKIP_DETAIL.has(word.posDetail)) return false
  if (word.pos === '名詞' && word.posDetail === '非自立' && NOMINALIZERS.has(word.surface)) return false
  return HAS_JAPANESE.test(word.surface)
}

// words: grouped words; statusOf(word) → 'known' | 'learning' | 'ignored' | null
export function score(words, statusOf) {
  const counts = { total: 0, known: 0, learning: 0, unknown: 0 }
  const unknownFreq = new Map()
  for (const w of words) {
    if (!isCounted(w)) continue
    const status = statusOf(w)
    if (status === 'ignored') continue
    counts.total++
    if (status === 'known') counts.known++
    else if (status === 'learning') counts.learning++
    else {
      counts.unknown++
      unknownFreq.set(w.lemma, (unknownFreq.get(w.lemma) ?? 0) + 1)
    }
  }
  const percent = counts.total === 0 ? 100 : Math.round((counts.known / counts.total) * 100)
  const topUnknown = [...unknownFreq]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([lemma, count]) => ({ lemma, count }))
  return { ...counts, percent, topUnknown }
}

// Rough JLPT level of a text: the level you need to know 90% of its distinct
// words. Words with an entry but no JLPT level count as "above N1" (0);
// words not in the dictionary (names, slang, errors) are left out.
// Returns 'N5'..'N1', 'N1+' or null when there is too little text.
export function estimateJlpt(words, coverage = 0.9) {
  const levels = new Map()
  for (const w of words) {
    if (w.jmdictId == null || levels.has(w.jmdictId)) continue
    levels.set(w.jmdictId, w.jlpt ?? 0)
  }
  if (levels.size < 5) return null
  const sorted = [...levels.values()].sort((a, b) => b - a) // easiest (5) first
  const level = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * coverage) - 1)]
  return level === 0 ? 'N1+' : `N${level}`
}
