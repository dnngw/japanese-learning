import { toHiragana } from 'wanakana'
import * as dict from '../models/dictionaryModel.js'

const KANJI = /[㐀-䶿一-鿿豈-﫿々]/
const hira = (s) => toHiragana(s, { passRomaji: true })

// kuromoji part of speech → JMdict part-of-speech tag prefix.
const POS_MATCH = {
  動詞: /^v/,
  形容詞: /^adj-i/,
  名詞: /^(n|pn|adj-no|adj-na|vs)/,
  副詞: /^adv/,
  連体詞: /^adj-pn/,
  感動詞: /^int/,
  接続詞: /^conj/,
  助詞: /^prt/,
  接頭詞: /^pref/,
}

export const isAvailable = () => dict.isOpen()

// Reading of the dictionary form, derived from the reading of the surface form:
// 食べ(たべ) + lemma 食べる → たべる,  読ん(よん) + lemma 読む → よむ
export function dictionaryReading(word) {
  const head = word.tokens[0]
  if (!head?.reading) return null
  const reading = hira(head.reading)
  const surface = head.surface
  const lemma = word.lemma
  let p = 0
  while (p < surface.length && p < lemma.length && surface[p] === lemma[p]) p++
  const surfaceTail = hira(surface.slice(p))
  const lemmaTail = hira(lemma.slice(p))
  if (!reading.endsWith(surfaceTail)) return null
  return reading.slice(0, reading.length - surfaceTail.length) + lemmaTail
}

// Picks the JMdict entry that best fits a word from the reader.
export function findEntry(word) {
  if (!isAvailable()) return null
  let ids = dict.entryIdsForText(word.lemma)
  if (ids.length === 0 && word.surface !== word.lemma) ids = dict.entryIdsForText(word.surface)
  if (ids.length === 0) return null

  const reading = dictionaryReading(word)
  const lemmaHasKanji = KANJI.test(word.lemma)
  const posRe = POS_MATCH[word.pos]

  let best = null
  let bestScore = -1
  for (const id of ids) {
    const e = dict.entryById(id)
    let score = 0
    const kanaMatch = e.kana.find(
      (k) => k.text === reading && (!lemmaHasKanji || !k.appliesTo || k.appliesTo.includes(word.lemma)),
    )
    if (kanaMatch) score += 8
    if (lemmaHasKanji ? e.kanji.some((k) => k.text === word.lemma) : e.kana.some((k) => k.text === word.lemma)) score += 2
    if (posRe && e.senses.some((s) => s.pos.some((p) => posRe.test(p)))) score += 3
    if (e.common) score += 2
    if (e.jlpt) score += 1
    if (score > bestScore) {
      best = e
      bestScore = score
    }
  }
  return best
}

// Furigana lookup for furiganaService: (surface, reading) → [{ text, rt? }]
export function furiganaLookup(text, reading) {
  if (!isAvailable()) return null
  const parts = dict.furiganaParts(text, reading)
  return parts ? parts.map(([t, rt]) => (rt ? { text: t, rt } : { text: t })) : null
}

// Entry shaped for the UI, with tag codes expanded (v1 → "Ichidan verb").
export function entryForDisplay(id) {
  if (!isAvailable()) return null
  const e = dict.entryById(id)
  if (!e) return null
  return {
    id: e.id,
    common: e.common,
    jlpt: e.jlpt ? `N${e.jlpt}` : null,
    kanji: e.kanji.map((k) => k.text),
    kana: e.kana.map((k) => k.text),
    senses: e.senses.map((s) => ({
      pos: s.pos.map(dict.tagDescription),
      gloss: s.gloss,
      misc: (s.misc ?? []).map(dict.tagDescription),
      info: s.info ?? [],
    })),
  }
}

export function info() {
  if (!isAvailable()) return null
  const m = dict.meta()
  return { jmdictDate: m.jmdict_date, jmdictVersion: m.jmdict_version, builtAt: m.built_at, license: m.license }
}
