import Database from 'better-sqlite3'

// Read-only access to dict.db (built by tools/dict-builder). The app keeps
// working without it: readers just get no meanings and simpler furigana.

let db = null
let stmts = null
let tagMap = null

export function openDictionary(file) {
  db = new Database(file, { readonly: true, fileMustExist: true })
  stmts = {
    idsForText: db.prepare('SELECT DISTINCT entry_id AS id FROM forms WHERE text = ? LIMIT 30'),
    entry: db.prepare('SELECT id, common, jlpt, senses FROM entries WHERE id = ?'),
    forms: db.prepare('SELECT kind, text, common, tags, applies_to FROM forms WHERE entry_id = ? ORDER BY kind, ord'),
    furigana: db.prepare('SELECT parts FROM furigana WHERE text = ? AND reading = ?'),
    meta: db.prepare('SELECT key, value FROM meta'),
    tags: db.prepare('SELECT tag, description FROM tags'),
  }
  tagMap = new Map(stmts.tags.all().map((t) => [t.tag, t.description]))
}

export const isOpen = () => db !== null

export function entryIdsForText(text) {
  return stmts.idsForText.all(text).map((r) => r.id)
}

export function entryById(id) {
  const row = stmts.entry.get(id)
  if (!row) return null
  const forms = stmts.forms.all(id)
  return {
    id: row.id,
    common: row.common === 1,
    jlpt: row.jlpt,
    senses: JSON.parse(row.senses),
    kanji: forms.filter((f) => f.kind === 0).map((f) => ({ text: f.text, common: f.common === 1, tags: JSON.parse(f.tags ?? '[]') })),
    kana: forms
      .filter((f) => f.kind === 1)
      .map((f) => ({ text: f.text, common: f.common === 1, tags: JSON.parse(f.tags ?? '[]'), appliesTo: JSON.parse(f.applies_to ?? 'null') })),
  }
}

export function furiganaParts(text, reading) {
  const row = stmts.furigana.get(text, reading)
  return row ? JSON.parse(row.parts) : null
}

export function meta() {
  return Object.fromEntries(stmts.meta.all().map((r) => [r.key, r.value]))
}

export const tagDescription = (tag) => tagMap?.get(tag) ?? tag

// Entries at or easier than a JLPT level (5 = N5 ... 1 = N1), for onboarding.
export function entriesUpToJlpt(minLevel) {
  return db
    .prepare(
      `SELECT e.id,
         (SELECT text FROM forms WHERE entry_id = e.id AND kind = 0 ORDER BY common DESC, ord LIMIT 1) AS kanji,
         (SELECT text FROM forms WHERE entry_id = e.id AND kind = 1 ORDER BY common DESC, ord LIMIT 1) AS kana
       FROM entries e WHERE e.jlpt >= ?`,
    )
    .all(minLevel)
}

// Random entries of the same broad part of speech and similar difficulty, for quiz distractors.
export function randomSimilarEntries({ pos, jlpt, excludeIds, limit }) {
  const exclude = excludeIds.length ? excludeIds : [0]
  const placeholders = exclude.map(() => '?').join(',')
  const level = jlpt ?? 0
  const rows = db
    .prepare(
      `SELECT id FROM entries
       WHERE pos = ? AND common = 1 AND id NOT IN (${placeholders})
         AND (? = 0 OR jlpt BETWEEN ? AND ?)
       ORDER BY random() LIMIT ?`,
    )
    .all(pos ?? 'noun', ...exclude, level, Math.max(1, level - 1), Math.min(5, level + 1), limit)
  return rows.map((r) => r.id)
}

export function posOf(id) {
  return db.prepare('SELECT pos FROM entries WHERE id = ?').get(id)?.pos ?? null
}
