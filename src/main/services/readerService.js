import { toHiragana } from 'wanakana'
import * as cardModel from '../models/cardModel.js'
import * as wordModel from '../models/wordModel.js'
import { MATURE_STABILITY_DAYS } from './reviewService.js'
import * as textService from './textService.js'
import * as dictionary from './dictionaryService.js'
import { furiganaForWord } from './furiganaService.js'
import { estimateJlpt, isCounted, score } from './scoringService.js'
import { tokenize } from './tokenizerService.js'
import { groupTokens } from './wordGroupingService.js'

// Turns raw text into lines of words with furigana, dictionary entry, status
// and a comprehension score.
export async function analyze(text) {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n')
  const lines = []
  for (const line of rawLines) {
    const words = line.trim() ? groupTokens(await tokenize(line)) : []
    lines.push({ text: line, words })
  }
  const all = lines.flatMap((l) => l.words)

  // Resolve each distinct content word to a JMdict entry once.
  const entryCache = new Map()
  for (const w of all) {
    w.counted = isCounted(w)
    if (!w.counted) continue
    const key = `${w.lemma}|${w.pos}|${w.tokens[0].reading}`
    if (!entryCache.has(key)) entryCache.set(key, dictionary.findEntry(w))
    const entry = entryCache.get(key)
    w.jmdictId = entry?.id ?? null
    w.jlpt = entry?.jlpt ?? null
    w.dictReading = entry ? pickReading(entry, w) : dictionary.dictionaryReading(w)
  }

  const saved = wordModel.findForWords({
    jmdictIds: [...new Set(all.map((w) => w.jmdictId).filter(Boolean))],
    lemmas: [...new Set(all.map((w) => w.lemma))],
  })
  // A word still marked "learning" whose card is well established counts as known.
  const stability = cardModel.stabilityByWord(saved.filter((s) => s.status === 'learning').map((s) => s.id))
  const effective = (s) =>
    s.status === 'learning' && (stability.get(s.id) ?? 0) >= MATURE_STABILITY_DAYS ? 'known' : s.status
  const byJmdict = new Map(saved.filter((s) => s.jmdictId).map((s) => [s.jmdictId, effective(s)]))
  const byLemma = new Map(saved.filter((s) => !s.jmdictId).map((s) => [s.lemma, effective(s)]))
  const statusOf = (w) => (w.jmdictId && byJmdict.get(w.jmdictId)) || byLemma.get(w.lemma) || null

  return {
    dictionary: dictionary.isAvailable(),
    lines: lines.map((l) => ({
      text: l.text,
      words: l.words.map((w) => ({
        surface: w.surface,
        lemma: w.lemma,
        reading: w.dictReading ?? toHiragana(w.tokens.map((t) => t.reading ?? t.surface).join(''), { passRomaji: true }),
        pos: w.pos,
        counted: w.counted,
        jmdictId: w.jmdictId ?? null,
        jlpt: w.jlpt ?? null,
        status: w.counted ? statusOf(w) : null,
        segments: furiganaForWord(w, dictionary.furiganaLookup),
      })),
    })),
    stats: { ...score(all, statusOf), jlpt: estimateJlpt(all.filter((w) => w.counted)) },
  }
}

// Opens a saved text and analyzes it; subtitle lines get their timestamps.
export async function analyzeText(id) {
  const text = textService.open(id)
  const result = await analyze(text.content)
  if (Array.isArray(text.cues)) {
    result.lines.forEach((line, i) => {
      const cue = text.cues[i]
      if (cue) Object.assign(line, { startMs: cue.startMs, endMs: cue.endMs })
    })
  }
  return { text: { id: text.id, title: text.title, kind: text.kind }, ...result }
}

// Dictionary-form reading that belongs to the entry (falls back to the first kana form).
function pickReading(entry, word) {
  const derived = dictionary.dictionaryReading(word)
  if (derived && entry.kana.some((k) => k.text === derived)) return derived
  return entry.kana[0]?.text ?? derived
}
