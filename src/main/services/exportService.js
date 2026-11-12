import Database from 'better-sqlite3'
import { zipSync, strToU8 } from 'fflate'
import { createHash, randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { getDb, getSqlite } from '../models/db.js'
import { cards, reviewLogs, settings, texts, wordContexts, words } from '../models/schema.js'
import * as dictionary from './dictionaryService.js'

const JMDICT_CREDIT =
  'Definitions from JMdict (EDRDG), CC BY-SA 4.0 — https://www.edrdg.org/edrdg/licence.html. Exported from JapanLearn.'

// Words with the meaning and sentence used for exports.
function exportRows({ statuses }) {
  const db = getDb()
  const contexts = Map.groupBy(db.select().from(wordContexts).all(), (c) => c.wordId)
  return db
    .select()
    .from(words)
    .all()
    .filter((w) => statuses.includes(w.status) && w.source !== 'onboarding')
    .map((w) => {
      const entry = w.jmdictId ? dictionary.entryForDisplay(w.jmdictId) : null
      const ctx = (contexts.get(w.id) ?? []).sort((a, b) => b.createdAt - a.createdAt)[0]
      return {
        word: w.lemma,
        reading: w.reading,
        meaning: w.customMeaning ?? (entry ? entry.senses.slice(0, 3).map((s) => s.gloss.join('; ')).join(' / ') : ''),
        sentence: ctx?.sentence ?? '',
        surface: ctx?.surface ?? '',
        notes: w.note ?? '',
        status: w.status,
        jlpt: entry?.jlpt ?? '',
        createdAt: w.createdAt.toISOString(),
      }
    })
}

// ---------- CSV ----------

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(file, { statuses = ['learning', 'known'] } = {}) {
  const rows = exportRows({ statuses })
  const header = ['word', 'reading', 'meaning', 'sentence', 'notes', 'status', 'jlpt', 'created_at']
  const lines = [header.join(','), ...rows.map((r) => [r.word, r.reading, r.meaning, r.sentence, r.notes, r.status, r.jlpt, r.createdAt].map(csvCell).join(','))]
  // BOM so spreadsheet apps detect UTF-8 (Japanese text).
  writeFileSync(file, `\ufeff${lines.join('\r\n')}\r\n`, 'utf8')
  return { count: rows.length }
}

// ---------- Anki .apkg (legacy collection format, imported by all Anki versions) ----------

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function highlight(sentence, surface) {
  const html = escapeHtml(sentence)
  return surface ? html.replace(escapeHtml(surface), `<b>${escapeHtml(surface)}</b>`) : html
}

const ANKI_SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`

const FIELDS = ['Word', 'Reading', 'Meaning', 'Sentence', 'Notes']
const CSS = `.card { font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; font-size: 22px; text-align: center; color: #1f2328; background: #fbfaf7; }
.word { font-size: 44px; margin: 12px 0; }
.sentence { font-size: 20px; color: #555; }
.sentence b { color: #2f6f62; }
.reading { font-size: 26px; color: #2f6f62; }
.notes { font-size: 16px; color: #777; margin-top: 10px; }`

export function buildApkg({ statuses = ['learning'], deckName = 'JapanLearn' } = {}) {
  const rows = exportRows({ statuses })
  const now = Date.now()
  const nowSec = Math.floor(now / 1000)
  const deckId = now
  const modelId = now + 1

  const model = {
    id: modelId,
    name: 'JapanLearn Word',
    type: 0,
    mod: nowSec,
    usn: -1,
    sortf: 0,
    did: deckId,
    tmpls: [
      {
        name: 'Recognition',
        ord: 0,
        qfmt: '<div class="sentence">{{Sentence}}</div><div class="word">{{Word}}</div>',
        afmt: '{{FrontSide}}<hr id="answer"><div class="reading">{{Reading}}</div><div class="meaning">{{Meaning}}</div><div class="notes">{{Notes}}</div>',
        did: null,
        bqfmt: '',
        bafmt: '',
      },
    ],
    flds: FIELDS.map((name, ord) => ({ name, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] })),
    css: CSS,
    latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
    latexPost: '\\end{document}',
    tags: [],
    vers: [],
    req: [[0, 'any', [0]]],
  }
  const deckBase = { collapsed: false, conf: 1, dyn: 0, extendNew: 10, extendRev: 50, lrnToday: [0, 0], newToday: [0, 0], revToday: [0, 0], timeToday: [0, 0], usn: -1, mod: nowSec }
  const decks = {
    1: { ...deckBase, id: 1, name: 'Default', desc: '' },
    [deckId]: { ...deckBase, id: deckId, name: deckName, desc: JMDICT_CREDIT },
  }
  const dconf = {
    1: {
      id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true,
      new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
      rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 },
      lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
    },
  }
  const conf = { activeDecks: [1], curDeck: deckId, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: String(modelId), nextPos: rows.length + 1, sortType: 'noteFld', sortBackwards: false, addToCur: true }

  const dir = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-apkg-'))
  const dbFile = path.join(dir, 'collection.anki2')
  try {
    const db = new Database(dbFile)
    db.exec(ANKI_SCHEMA)
    db.prepare('INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)').run(
      nowSec, now, now, JSON.stringify(conf), JSON.stringify({ [modelId]: model }), JSON.stringify(decks), JSON.stringify(dconf), '{}',
    )
    const insNote = db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, \'\')')
    const insCard = db.prepare('INSERT INTO cards VALUES (?, ?, ?, 0, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, \'\')')
    db.transaction(() => {
      rows.forEach((r, i) => {
        const id = now + 10 + i * 2
        const fields = [escapeHtml(r.word), escapeHtml(r.reading), escapeHtml(r.meaning), highlight(r.sentence, r.surface), escapeHtml(r.notes)]
        const csum = parseInt(createHash('sha1').update(r.word).digest('hex').slice(0, 8), 16)
        const guid = randomBytes(8).toString('base64url')
        insNote.run(id, guid, modelId, nowSec, ' japanlearn ', fields.join('\x1f'), r.word, csum)
        insCard.run(id + 1, id, deckId, nowSec, i + 1)
      })
    })()
    db.close()
    const zip = zipSync({ 'collection.anki2': readFileSync(dbFile), media: strToU8('{}') })
    return { data: zip, count: rows.length }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function exportApkg(file, options) {
  const { data, count } = buildApkg(options)
  writeFileSync(file, data)
  return { count }
}

// ---------- Full JSON backup / restore ----------

const TABLES = { texts, words, wordContexts, cards, reviewLogs, settings }
const BACKUP_FORMAT = 'japanlearn-backup'

export function exportJson(file) {
  const db = getDb()
  const data = Object.fromEntries(Object.entries(TABLES).map(([name, table]) => [name, db.select().from(table).all()]))
  writeFileSync(file, JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data }))
  return { counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])) }
}

const Backup = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  data: z.object(Object.fromEntries(Object.keys(TABLES).map((k) => [k, z.array(z.record(z.string(), z.unknown()))]))),
})

// Timestamp columns are stored as Date by Drizzle; JSON turns them into strings.
const DATE_COLUMNS = new Set(['createdAt', 'lastOpenedAt', 'due', 'lastReview', 'reviewedAt'])
const revive = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, DATE_COLUMNS.has(k) && v != null ? new Date(v) : v]))

// Replaces ALL user data with the backup (one transaction: all or nothing).
export function restoreJson(file) {
  let parsed
  try {
    parsed = Backup.parse(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    throw new Error('This file is not a JapanLearn backup.')
  }
  const db = getDb()
  const order = ['texts', 'words', 'wordContexts', 'cards', 'reviewLogs', 'settings']
  db.transaction((tx) => {
    for (const name of [...order].reverse()) tx.delete(TABLES[name]).run()
    for (const name of order) {
      const rows = parsed.data[name].map(revive)
      for (let i = 0; i < rows.length; i += 500) {
        if (rows.length) tx.insert(TABLES[name]).values(rows.slice(i, i + 500)).run()
      }
    }
  })
  return { counts: Object.fromEntries(order.map((k) => [k, parsed.data[k].length])) }
}

// Exact copy of user.db (SQLite online backup, safe while the app runs).
export async function backupDatabase(file) {
  await getSqlite().backup(file)
  return { ok: true }
}
