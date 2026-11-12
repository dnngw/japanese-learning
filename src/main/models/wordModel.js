import { and, count, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { getDb } from './db.js'
import { wordContexts, words } from './schema.js'

export function findByLemmas(lemmas) {
  if (lemmas.length === 0) return []
  return getDb().select().from(words).where(inArray(words.lemma, lemmas)).all()
}

// Saved words matching either a JMdict entry or (for words without one) a lemma.
export function findForWords({ jmdictIds, lemmas }) {
  const conds = []
  if (jmdictIds.length) conds.push(inArray(words.jmdictId, jmdictIds))
  if (lemmas.length) conds.push(inArray(words.lemma, lemmas))
  if (conds.length === 0) return []
  return getDb()
    .select()
    .from(words)
    .where(or(...conds))
    .all()
}

// Paged list with optional status filter and search over lemma/reading/meaning/note.
export function list({ status = null, search = '', source = null, limit = 100, offset = 0 } = {}) {
  const db = getDb()
  const conds = []
  if (status) conds.push(eq(words.status, status))
  if (source) conds.push(eq(words.source, source))
  const q = search.trim()
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    const likeEsc = (col) => sql`${col} LIKE ${pattern} ESCAPE '\\'`
    conds.push(or(likeEsc(words.lemma), likeEsc(words.reading), likeEsc(words.customMeaning), likeEsc(words.note)))
  }
  const where = conds.length ? and(...conds) : undefined
  const rows = db.select().from(words).where(where).orderBy(desc(words.createdAt), desc(words.id)).limit(limit).offset(offset).all()
  const total = db.select({ n: count() }).from(words).where(where).get().n
  const ids = rows.map((r) => r.id)
  const contexts = ids.length
    ? db.select().from(wordContexts).where(inArray(wordContexts.wordId, ids)).orderBy(desc(wordContexts.createdAt)).all()
    : []
  const byWord = Map.groupBy(contexts, (c) => c.wordId)
  return { total, items: rows.map((w) => ({ ...w, contexts: byWord.get(w.id) ?? [] })) }
}

export function countsByStatus() {
  const rows = getDb().select({ status: words.status, n: count() }).from(words).groupBy(words.status).all()
  return Object.fromEntries(['learning', 'known', 'ignored'].map((s) => [s, rows.find((r) => r.status === s)?.n ?? 0]))
}

export function getById(id) {
  return getDb().select().from(words).where(eq(words.id, id)).get()
}

export function contextsFor(wordId) {
  return getDb().select().from(wordContexts).where(eq(wordContexts.wordId, wordId)).orderBy(desc(wordContexts.createdAt)).all()
}

// Saves a word (or reuses the existing row) and records the sentence it came from.
export function saveWithContext({ jmdictId = null, lemma, reading, status, surface, sentence, textId, startMs, endMs }) {
  const db = getDb()
  return db.transaction((tx) => {
    // The JMdict entry is the real identity of a word; lemma + reading is the fallback.
    let word =
      (jmdictId && tx.select().from(words).where(eq(words.jmdictId, jmdictId)).get()) ||
      tx
        .select()
        .from(words)
        .where(and(eq(words.lemma, lemma), eq(words.reading, reading)))
        .get()
    if (!word) {
      word = tx.insert(words).values({ jmdictId, lemma, reading, status }).returning().get()
    } else if (status && status !== word.status) {
      word = tx.update(words).set({ status }).where(eq(words.id, word.id)).returning().get()
    }
    if (sentence) {
      tx.insert(wordContexts)
        .values({ wordId: word.id, surface, sentence, textId, startMs, endMs })
        .run()
    }
    return word
  })
}

export function setStatus(id, status) {
  return getDb().update(words).set({ status }).where(eq(words.id, id)).returning().get()
}

export function remove(id) {
  getDb().delete(words).where(eq(words.id, id)).run()
}

// Marks dictionary entries as known in bulk (onboarding). Never touches words
// the user already saved; returns how many rows were added.
export function bulkMarkKnown(entries, source = 'onboarding') {
  const db = getDb()
  return db.transaction((tx) => {
    const existing = new Set(
      tx
        .select({ id: words.jmdictId })
        .from(words)
        .all()
        .map((r) => r.id),
    )
    let added = 0
    for (const e of entries) {
      if (existing.has(e.id)) continue
      const res = tx
        .insert(words)
        .values({ jmdictId: e.id, lemma: e.kanji ?? e.kana, reading: e.kana ?? '', status: 'known', source })
        .onConflictDoNothing()
        .run()
      added += res.changes
    }
    return added
  })
}

export function removeBySource(source) {
  return getDb().delete(words).where(eq(words.source, source)).run().changes
}

export function update(id, values) {
  return getDb().update(words).set(values).where(eq(words.id, id)).returning().get()
}

export function countBySource(source) {
  return getDb().select({ id: words.id }).from(words).where(eq(words.source, source)).all().length
}
