import { toHiragana } from 'wanakana'
import * as cardModel from '../models/cardModel.js'
import * as dictModel from '../models/dictionaryModel.js'
import * as wordModel from '../models/wordModel.js'
import * as dictionary from './dictionaryService.js'
import { recordPractice } from './reviewService.js'
import { isCounted } from './scoringService.js'
import { tokenize } from './tokenizerService.js'
import { groupTokens } from './wordGroupingService.js'

export const MODES = ['meaning', 'reading', 'cloze', 'listening', 'order']
const KANJI = /[㐀-䶿一-鿿々]/

const shuffle = (a) => {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
const hira = (s) => toHiragana(s, { passRomaji: true })
const glossOf = (entry) => entry?.senses[0]?.gloss.slice(0, 3).join('; ') ?? null

// Words to practice: ones being learned first, then known words saved from texts,
// then (only if the collection is tiny) words marked known during onboarding.
function pool() {
  const take = (filters) => wordModel.list({ ...filters, limit: 500 }).items
  const learning = take({ status: 'learning' })
  const known = take({ status: 'known', source: 'reader' })
  let words = [...shuffle(learning), ...shuffle(known)]
  if (words.length < 10) words = [...words, ...shuffle(take({ status: 'known', source: 'onboarding' })).slice(0, 50)]
  return words.map((w) => ({ ...w, entry: w.jmdictId ? dictionary.entryForDisplay(w.jmdictId) : null }))
}

// Choices: correct answer + up to 3 distinct distractors, shuffled.
function choices(correct, distractors) {
  const opts = [correct, ...[...new Set(distractors.filter((d) => d && d !== correct))].slice(0, 3)]
  if (opts.length < 2) return null
  const shuffled = shuffle(opts)
  return { choices: shuffled, answerIndex: shuffled.indexOf(correct) }
}

function similarEntries(w, n) {
  if (!w.jmdictId || !dictionary.isAvailable()) return []
  const pos = dictModel.posOf(w.jmdictId)
  const level = w.entry?.jlpt ? Number(w.entry.jlpt.slice(1)) : null
  return dictModel.randomSimilarEntries({ pos, jlpt: level, excludeIds: [w.jmdictId], limit: n }).map((id) => dictionary.entryForDisplay(id))
}

function meaningQuestion(w) {
  const correct = w.customMeaning ?? glossOf(w.entry)
  if (!correct) return null
  const c = choices(correct, similarEntries(w, 6).map(glossOf))
  return c && { prompt: { lemma: w.lemma, sentence: w.contexts[0]?.sentence ?? null, surface: w.contexts[0]?.surface ?? null }, ...c }
}

function readingQuestion(w) {
  if (!KANJI.test(w.lemma) || !w.reading) return null
  const accept = [...new Set([w.reading, ...(w.entry?.kana ?? [])].map(hira))]
  return { prompt: { lemma: w.lemma, sentence: w.contexts[0]?.sentence ?? null, surface: w.contexts[0]?.surface ?? null }, answer: hira(w.reading), accept }
}

function clozeQuestion(w, others) {
  const ctx = w.contexts.find((c) => c.surface && c.sentence.includes(c.surface))
  if (!ctx) return null
  const i = ctx.sentence.indexOf(ctx.surface)
  const sameKind = others.filter((o) => o.id !== w.id && o.entry && dictModel.posOf(o.jmdictId) === dictModel.posOf(w.jmdictId))
  const distractors = [...shuffle(sameKind).map((o) => o.lemma), ...similarEntries(w, 6).map((e) => e?.kanji[0] ?? e?.kana[0])]
  const c = choices(w.lemma, distractors)
  return (
    c && {
      prompt: { before: ctx.sentence.slice(0, i), after: ctx.sentence.slice(i + ctx.surface.length), hint: w.customMeaning ?? glossOf(w.entry), answerSurface: ctx.surface },
      ...c,
    }
  )
}

function listeningQuestion(w) {
  if (!w.reading) return null
  const accept = [...new Set([w.reading, ...(w.entry?.kana ?? [])].map(hira))]
  return { speak: w.reading, answer: hira(w.reading), accept, reveal: { lemma: w.lemma, meaning: w.customMeaning ?? glossOf(w.entry) } }
}

// Splits a sentence into word chunks, keeping particles and punctuation
// attached to the word before them (食べました。 / 駅まで / 歩きました。).
export async function sentenceChunks(sentence) {
  const groups = groupTokens(await tokenize(sentence))
  const chunks = []
  for (const g of groups) {
    const glue = !isCounted(g) && chunks.length > 0
    if (glue) chunks[chunks.length - 1] += g.surface
    else chunks.push(g.surface)
  }
  return chunks.map((c) => c.trim()).filter(Boolean)
}

async function orderQuestion(w) {
  const ctx = w.contexts[0]
  if (!ctx) return null
  const chunks = await sentenceChunks(ctx.sentence)
  if (chunks.length < 3 || chunks.length > 9) return null
  let shuffled = shuffle(chunks)
  for (let i = 0; i < 5 && shuffled.join('') === chunks.join(''); i++) shuffled = shuffle(chunks)
  return { chunks: shuffled, answer: chunks, meaning: w.customMeaning ?? glossOf(w.entry), lemma: w.lemma }
}

export async function buildSession({ mode, count }) {
  const words = pool()
  const questions = []
  for (const w of words) {
    if (questions.length >= count) break
    let q = null
    if (mode === 'meaning') q = meaningQuestion(w)
    else if (mode === 'reading') q = readingQuestion(w)
    else if (mode === 'cloze') q = clozeQuestion(w, words)
    else if (mode === 'listening') q = listeningQuestion(w)
    else if (mode === 'order') q = await orderQuestion(w)
    if (q) questions.push({ id: `${mode}-${w.id}`, mode, wordId: w.id, ...q })
  }
  return { mode, questions, poolSize: words.length }
}

// results: [{ wordId, correct, durationMs }] → optionally counted as reviews.
export function record(results) {
  const cards = new Map(cardModel.wordCardsForWords(results.map((r) => r.wordId)).map((c) => [c.wordId, c]))
  let counted = 0
  for (const r of results) {
    const card = cards.get(r.wordId)
    if (card && recordPractice({ cardId: card.id, correct: r.correct, durationMs: r.durationMs })) counted++
  }
  return { counted }
}
