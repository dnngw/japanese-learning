import { and, asc, count, eq, gt, inArray, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { getDb } from './db.js'
import { cards, wordContexts, words } from './schema.js'

// Reviewed cards: kana cards, and word cards of words the user is still learning.
// Marking a word "known"/"ignored" pauses its card; "learning" resumes it.
const active = or(eq(cards.type, 'kana'), eq(words.status, 'learning'))

const cardWithWord = {
  card: cards,
  word: { id: words.id, jmdictId: words.jmdictId, lemma: words.lemma, reading: words.reading, customMeaning: words.customMeaning },
}

const withWords = () => getDb().select(cardWithWord).from(cards).leftJoin(words, eq(cards.wordId, words.id))
const countWithWords = () => getDb().select({ n: count() }).from(cards).leftJoin(words, eq(cards.wordId, words.id))

export function insertIfMissing(values) {
  const target = values.kanaKey ? [cards.kanaKey] : [cards.wordId, cards.type]
  getDb().insert(cards).values(values).onConflictDoNothing({ target }).run()
  return values.kanaKey
    ? getDb().select().from(cards).where(eq(cards.kanaKey, values.kanaKey)).get()
    : getDb()
        .select()
        .from(cards)
        .where(and(eq(cards.wordId, values.wordId), eq(cards.type, values.type)))
        .get()
}

// Learning words that have no card yet (e.g. saved before reviews existed).
export function learningWordsWithoutCard(type) {
  return getDb()
    .select({ id: words.id })
    .from(words)
    .leftJoin(cards, and(eq(cards.wordId, words.id), eq(cards.type, type)))
    .where(and(eq(words.status, 'learning'), isNull(cards.id)))
    .all()
    .map((r) => r.id)
}

export function getById(id) {
  return getDb().select().from(cards).where(eq(cards.id, id)).get()
}

export function update(id, values) {
  getDb().update(cards).set(values).where(eq(cards.id, id)).run()
}

// Started cards due now, plus learning steps due within `learnAheadMs`
// (so a session doesn't stall waiting on a 1-minute step).
export function dueStarted(now, learnAheadMs) {
  const ahead = new Date(now.getTime() + learnAheadMs)
  return withWords()
    .where(and(active, ne(cards.state, 0), or(lte(cards.due, now), and(inArray(cards.state, [1, 3]), lte(cards.due, ahead)))))
    .orderBy(asc(cards.due))
    .all()
}

export function newCards(limit) {
  if (limit <= 0) return []
  return withWords()
    .where(and(active, eq(cards.state, 0)))
    .orderBy(asc(cards.createdAt), asc(cards.id))
    .limit(limit)
    .all()
}

// Same rule as dueStarted, so the badge matches what the review screen shows.
export function countDueStarted(now, learnAheadMs = 0) {
  const ahead = new Date(now.getTime() + learnAheadMs)
  return countWithWords()
    .where(and(active, ne(cards.state, 0), or(lte(cards.due, now), and(inArray(cards.state, [1, 3]), lte(cards.due, ahead)))))
    .get().n
}

export function countNew() {
  return countWithWords().where(and(active, eq(cards.state, 0))).get().n
}

export function latestContext(wordId) {
  return getDb()
    .select()
    .from(wordContexts)
    .where(eq(wordContexts.wordId, wordId))
    .orderBy(sql`${wordContexts.createdAt} DESC`)
    .limit(1)
    .get()
}

// Highest stability per word, used to treat well-learned words as known.
export function stabilityByWord(wordIds) {
  if (wordIds.length === 0) return new Map()
  const rows = getDb()
    .select({ wordId: cards.wordId, stability: sql`max(${cards.stability})` })
    .from(cards)
    .where(and(inArray(cards.wordId, wordIds), gt(cards.reps, 0)))
    .groupBy(cards.wordId)
    .all()
  return new Map(rows.map((r) => [r.wordId, r.stability]))
}

export function nextDueByWord(wordIds) {
  if (wordIds.length === 0) return new Map()
  const rows = getDb()
    .select({ wordId: cards.wordId, due: sql`min(${cards.due})`, state: sql`min(${cards.state})` })
    .from(cards)
    .where(inArray(cards.wordId, wordIds))
    .groupBy(cards.wordId)
    .all()
  return new Map(rows.map((r) => [r.wordId, r.state === 0 ? 'new' : new Date(r.due)]))
}

export function kanaCards() {
  return getDb()
    .select({ kanaKey: cards.kanaKey, state: cards.state, stability: cards.stability, due: cards.due, reps: cards.reps, lapses: cards.lapses })
    .from(cards)
    .where(isNotNull(cards.kanaKey))
    .all()
}

export function wordCardsForWords(wordIds) {
  if (wordIds.length === 0) return []
  return getDb()
    .select()
    .from(cards)
    .where(and(inArray(cards.wordId, wordIds), eq(cards.type, 'meaning')))
    .all()
}

export function all() {
  return getDb().select().from(cards).all()
}

export function getByKanaKey(kanaKey) {
  return getDb().select().from(cards).where(eq(cards.kanaKey, kanaKey)).get()
}
