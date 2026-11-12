// Builds resources/dict.db from JMdict, KANJIDIC2, JmdictFurigana and the JLPT list.
//
// Usage:
//   node tools/dict-builder/build.mjs            download latest releases (cached), build
//   node tools/dict-builder/build.mjs --offline  build from files already in downloads/
//
// dict.db is a derived work of CC BY-SA data and is itself CC BY-SA 4.0.

import Database from 'better-sqlite3'
import { unzipSync } from 'fflate'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCES } from './sources.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const DOWNLOADS = path.join(HERE, 'downloads')
const OUT = path.join(ROOT, 'resources', 'dict.db')
const OFFLINE = process.argv.includes('--offline')
const SCHEMA_VERSION = 2
const UA = 'dict-builder/0.1 (open-source Japanese learning app build script)'

const JLPT_LEVEL = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 }

const log = (...a) => console.log(...a)
const time = async (label, fn) => {
  const t = performance.now()
  const r = await fn()
  log(`  ${label} (${((performance.now() - t) / 1000).toFixed(1)}s)`)
  return r
}

// ---------- download ----------

async function resolveAsset(name, { repo, asset }) {
  if (OFFLINE) {
    const file = readdirSync(DOWNLOADS).find((f) => f.startsWith(`${name}--`))
    if (!file) throw new Error(`--offline: no cached file for ${name}`)
    const [, tag] = file.match(/^[^-]+--(.+?)--/)
    return { file: path.join(DOWNLOADS, file), tag: decodeURIComponent(tag) }
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${repo}`)
  const release = await res.json()
  const a = release.assets.find((x) => asset.test(x.name))
  if (!a) throw new Error(`No asset matching ${asset} in ${repo} ${release.tag_name}`)

  const file = path.join(DOWNLOADS, `${name}--${encodeURIComponent(release.tag_name)}--${a.name}`)
  if (!existsSync(file)) {
    // Drop older cached versions of this source.
    for (const old of readdirSync(DOWNLOADS).filter((f) => f.startsWith(`${name}--`))) rmSync(path.join(DOWNLOADS, old))
    log(`  downloading ${a.name} (${(a.size / 1e6).toFixed(1)} MB)`)
    const dl = await fetch(a.browser_download_url, { headers: { 'User-Agent': UA } })
    if (!dl.ok) throw new Error(`Download ${dl.status}: ${a.name}`)
    writeFileSync(file, Buffer.from(await dl.arrayBuffer()))
  }
  return { file, tag: release.tag_name }
}

// Returns the parsed JSON files inside a zip, keyed by file name.
function readZipJson(file) {
  const entries = unzipSync(readFileSync(file))
  const out = {}
  const decoder = new TextDecoder('utf-8') // strips a UTF-8 BOM if present
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith('.json')) out[path.basename(name)] = JSON.parse(decoder.decode(bytes))
  }
  return out
}

// ---------- build ----------

const SCHEMA = `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;

-- One row per JMdict entry. senses is compact JSON:
-- [{ pos: [...], gloss: [...], misc: [...], info: [...], field: [...], kanji: [...]|null, kana: [...]|null }]
CREATE TABLE entries (
  id INTEGER PRIMARY KEY,
  common INTEGER NOT NULL,
  jlpt INTEGER,
  pos TEXT,            -- broad part of speech of the first sense: verb, i-adj, na-adj, noun, adverb, other
  senses TEXT NOT NULL
);

-- Kanji and kana spellings. kind 0 = kanji, 1 = kana.
-- applies_to (kana only): JSON list of kanji spellings this reading belongs to, null = all.
CREATE TABLE forms (
  entry_id INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  ord INTEGER NOT NULL,
  text TEXT NOT NULL,
  common INTEGER NOT NULL,
  tags TEXT,
  applies_to TEXT
);
CREATE INDEX forms_text ON forms (text);
CREATE INDEX entries_pos_jlpt ON entries (pos, jlpt, common);
CREATE INDEX forms_entry ON forms (entry_id);

-- Per-kanji furigana, parts = JSON [[text, rt|null], ...]
CREATE TABLE furigana (text TEXT NOT NULL, reading TEXT NOT NULL, parts TEXT NOT NULL, PRIMARY KEY (text, reading)) WITHOUT ROWID;

CREATE TABLE kanji (
  literal TEXT PRIMARY KEY,
  meanings TEXT NOT NULL,
  onyomi TEXT NOT NULL,
  kunyomi TEXT NOT NULL,
  strokes INTEGER,
  grade INTEGER,
  freq INTEGER,
  jlpt_old INTEGER
) WITHOUT ROWID;

-- Descriptions for JMdict tags (v1 → "Ichidan verb", ...)
CREATE TABLE tags (tag TEXT PRIMARY KEY, description TEXT NOT NULL) WITHOUT ROWID;
`

// Groups JMdict POS tags into a few classes, used to pick quiz distractors of the same kind.
function broadPos(tags) {
  if (tags.some((t) => /^v[15kzs]|^vs|^v1/.test(t) && t !== 'vs')) return 'verb'
  if (tags.includes('adj-i') || tags.includes('adj-ix')) return 'i-adj'
  if (tags.includes('adj-na')) return 'na-adj'
  if (tags.some((t) => t.startsWith('adv'))) return 'adverb'
  if (tags.some((t) => t === 'n' || t === 'vs' || t.startsWith('n-') || t === 'pn')) return 'noun'
  return 'other'
}

const nonEmpty = (a) => (a && a.length ? a : undefined)
const appliesTo = (a) => (!a || a.includes('*') ? null : a)

function buildEntries(db, jmdict) {
  const insEntry = db.prepare('INSERT INTO entries (id, common, pos, senses) VALUES (?, ?, ?, ?)')
  const insForm = db.prepare(
    'INSERT INTO forms (entry_id, kind, ord, text, common, tags, applies_to) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  let forms = 0
  for (const w of jmdict.words) {
    const id = Number(w.id)
    const common = w.kanji.some((k) => k.common) || w.kana.some((k) => k.common)
    const senses = w.sense.map((s) =>
      JSON.parse(
        JSON.stringify({
          pos: s.partOfSpeech,
          gloss: s.gloss.filter((g) => g.lang === 'eng').map((g) => g.text),
          misc: nonEmpty(s.misc),
          info: nonEmpty(s.info),
          field: nonEmpty(s.field),
          kanji: appliesTo(s.appliesToKanji) ?? undefined,
          kana: appliesTo(s.appliesToKana) ?? undefined,
        }),
      ),
    )
    insEntry.run(id, common ? 1 : 0, broadPos(w.sense[0]?.partOfSpeech ?? []), JSON.stringify(senses))
    w.kanji.forEach((k, i) => {
      insForm.run(id, 0, i, k.text, k.common ? 1 : 0, k.tags.length ? JSON.stringify(k.tags) : null, null)
      forms++
    })
    w.kana.forEach((k, i) => {
      const at = appliesTo(k.appliesToKanji)
      insForm.run(id, 1, i, k.text, k.common ? 1 : 0, k.tags.length ? JSON.stringify(k.tags) : null, at ? JSON.stringify(at) : null)
      forms++
    })
  }
  const insTag = db.prepare('INSERT INTO tags (tag, description) VALUES (?, ?)')
  for (const [tag, desc] of Object.entries(jmdict.tags)) insTag.run(tag, desc)
  return { entries: jmdict.words.length, forms }
}

function buildFurigana(db, list) {
  const ins = db.prepare('INSERT OR IGNORE INTO furigana (text, reading, parts) VALUES (?, ?, ?)')
  let n = 0
  for (const f of list) {
    // Only useful when the word is actually split into more than one part.
    if (f.furigana.length < 2) continue
    ins.run(f.text, f.reading, JSON.stringify(f.furigana.map((p) => (p.rt ? [p.ruby, p.rt] : [p.ruby]))))
    n++
  }
  return n
}

function buildKanji(db, kanjidic) {
  const ins = db.prepare(
    'INSERT INTO kanji (literal, meanings, onyomi, kunyomi, strokes, grade, freq, jlpt_old) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
  for (const c of kanjidic.characters) {
    const groups = c.readingMeaning?.groups ?? []
    const readings = groups.flatMap((g) => g.readings)
    const meanings = groups.flatMap((g) => g.meanings.filter((m) => m.lang === 'en').map((m) => m.value))
    ins.run(
      c.literal,
      JSON.stringify(meanings),
      JSON.stringify(readings.filter((r) => r.type === 'ja_on').map((r) => r.value)),
      JSON.stringify(readings.filter((r) => r.type === 'ja_kun').map((r) => r.value)),
      c.misc.strokeCounts?.[0] ?? null,
      c.misc.grade ?? null,
      c.misc.frequency ?? null,
      c.misc.jlptLevel ?? null,
    )
  }
  return kanjidic.characters.length
}

// The JLPT list gives (term, reading). Match it to JMdict entries that have
// that spelling AND that reading; when several match, prefer common entries.
function applyJlpt(db, banks) {
  const rows = Object.entries(banks)
    .filter(([name]) => name.startsWith('term_meta_bank'))
    .flatMap(([, rows]) => rows)

  // Joins through the forms_text index (an EXISTS version scans every entry).
  const candidates = db.prepare(`
    SELECT DISTINCT e.id, e.common, e.jlpt
    FROM forms spelling
    JOIN forms reading ON reading.entry_id = spelling.entry_id AND reading.kind = 1 AND reading.text = @reading
    JOIN entries e ON e.id = spelling.entry_id
    WHERE spelling.text = @term
    ORDER BY e.common DESC, e.id
  `)
  const set = db.prepare('UPDATE entries SET jlpt = ? WHERE id = ?')
  let matched = 0
  let unmatched = 0
  for (const [term, , meta] of rows) {
    const level = JLPT_LEVEL[meta.frequency?.displayValue]
    if (!level) continue
    const found = candidates.all({ term, reading: meta.reading })
    if (found.length === 0) {
      unmatched++
      continue
    }
    // All common matches get the level; if none is common, only the first.
    const targets = found.some((e) => e.common) ? found.filter((e) => e.common) : [found[0]]
    for (const e of targets) {
      // Keep the easiest level if an entry appears twice.
      if (e.jlpt == null || level > e.jlpt) set.run(level, e.id)
    }
    matched++
  }
  return { matched, unmatched, total: rows.length }
}

async function main() {
  mkdirSync(DOWNLOADS, { recursive: true })
  mkdirSync(path.dirname(OUT), { recursive: true })

  log('Resolving sources' + (OFFLINE ? ' (offline)' : ''))
  const files = {}
  for (const [name, src] of Object.entries(SOURCES)) {
    files[name] = await resolveAsset(name, src)
    log(`  ${name.padEnd(9)} ${files[name].tag}`)
  }

  log('Reading data')
  const jmdict = await time('JMdict', () => Object.values(readZipJson(files.jmdict.file))[0])
  const kanjidic = await time('KANJIDIC2', () => Object.values(readZipJson(files.kanjidic.file))[0])
  const furigana = await time('JmdictFurigana', () => Object.values(readZipJson(files.furigana.file))[0])
  const jlpt = await time('JLPT', () => readZipJson(files.jlpt.file))

  const tmp = `${OUT}.tmp`
  rmSync(tmp, { force: true })
  const db = new Database(tmp)
  db.pragma('journal_mode = OFF')
  db.pragma('synchronous = OFF')
  db.exec(SCHEMA)

  log('Building dict.db')
  const stats = {}
  db.transaction(() => {
    Object.assign(stats, buildEntries(db, jmdict))
    stats.furigana = buildFurigana(db, furigana)
    stats.kanji = buildKanji(db, kanjidic)
  })()
  const jlptStats = db.transaction(() => applyJlpt(db, jlpt))()

  const meta = {
    schema_version: String(SCHEMA_VERSION),
    built_at: new Date().toISOString(),
    jmdict_version: files.jmdict.tag,
    jmdict_date: jmdict.dictDate,
    kanjidic_date: kanjidic.dictDate,
    furigana_version: files.furigana.tag,
    jlpt_version: files.jlpt.tag,
    license: 'CC BY-SA 4.0',
    attribution:
      'Built from JMdict and KANJIDIC2 (EDRDG, CC BY-SA 4.0, https://www.edrdg.org/edrdg/licence.html), ' +
      'JmdictFurigana by Doublevil (CC BY-SA), jmdict-simplified by scriptin (CC BY-SA 4.0), ' +
      "and yomitan-jlpt-vocab by stephenmk (CC BY-SA 4.0, based on Jonathan Waller's JLPT lists, CC BY).",
  }
  const insMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(meta)) insMeta.run(k, v)

  db.exec('ANALYZE')
  db.exec('VACUUM')
  db.close()
  renameSync(tmp, OUT)

  const size = (readFileSync(OUT).length / 1e6).toFixed(1)
  log(`\nDone: ${path.relative(ROOT, OUT)} (${size} MB)`)
  log(`  entries  ${stats.entries}`)
  log(`  forms    ${stats.forms}`)
  log(`  furigana ${stats.furigana}`)
  log(`  kanji    ${stats.kanji}`)
  log(`  jlpt     ${jlptStats.matched}/${jlptStats.total} list items matched (${jlptStats.unmatched} unmatched)`)
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`)
  process.exit(1)
})
