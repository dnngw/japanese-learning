// Downloads the kana pronunciation set from Wikimedia Commons.
//
// For every file it:
//   1. reads the license from the Commons API (extmetadata),
//   2. refuses anything not on ALLOWED_LICENSES,
//   3. downloads the original file and checks its SHA-1 against Commons,
//   4. records author / license / source URL in attribution.json.
//
// Usage: node tools/fetch-kana-audio/fetch.mjs
// Output: assets/audio/kana/*.ogg + assets/audio/kana/attribution.json

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = path.join(ROOT, 'assets/audio/kana')
const API = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = 'kana-audio-fetch/0.1 (open-source Japanese learning app build script)'

// Licenses we accept for bundled audio. Anything else stops the script.
const ALLOWED_LICENSES = [
  /^Public domain$/i,
  /^CC0( 1\.0)?$/i,
  /^CC BY( \d\.\d)?$/i,
  /^CC BY-SA( \d\.\d)?$/i,
]

// key = output filename (unique), romaji = what the UI shows.
// All files are from one speaker: Commons user Hakatanoshio117117 (released as public domain).
// Katakana reuses the same recording (same sound).
const KANA = [
  ['a', 'あ', 'ア', 'a', 'Ja-A.oga'],
  ['i', 'い', 'イ', 'i', 'Japanese I.ogg'],
  ['u', 'う', 'ウ', 'u', 'Japanese U.ogg'],
  ['e', 'え', 'エ', 'e', 'Ja-E.oga'],
  ['o', 'お', 'オ', 'o', 'Japanese O.ogg'],
  ['ka', 'か', 'カ', 'ka', 'Japanese ka.ogg'],
  ['ki', 'き', 'キ', 'ki', 'Japanese ki.ogg'],
  ['ku', 'く', 'ク', 'ku', 'Japanese ku.ogg'],
  ['ke', 'け', 'ケ', 'ke', 'Japanese ke.ogg'],
  ['ko', 'こ', 'コ', 'ko', 'Japanese ko.ogg'],
  ['sa', 'さ', 'サ', 'sa', 'Japanese sa.ogg'],
  ['shi', 'し', 'シ', 'shi', 'Japanese shi.ogg'],
  ['su', 'す', 'ス', 'su', 'Japanese su.ogg'],
  ['se', 'せ', 'セ', 'se', 'Japanese se.ogg'],
  ['so', 'そ', 'ソ', 'so', 'Japanese so.ogg'],
  ['ta', 'た', 'タ', 'ta', 'Japanese ta.ogg'],
  ['chi', 'ち', 'チ', 'chi', 'Japanese ti.ogg'],
  ['tsu', 'つ', 'ツ', 'tsu', 'Japanese tsu.ogg'],
  ['te', 'て', 'テ', 'te', 'Japanese te.ogg'],
  ['to', 'と', 'ト', 'to', 'Japanese to.ogg'],
  ['na', 'な', 'ナ', 'na', 'Japanese na.ogg'],
  ['ni', 'に', 'ニ', 'ni', 'Japanese ni.ogg'],
  ['nu', 'ぬ', 'ヌ', 'nu', 'Japanese nu.ogg'],
  ['ne', 'ね', 'ネ', 'ne', 'Japanese ne.ogg'],
  ['no', 'の', 'ノ', 'no', 'Japanese no.ogg'],
  ['ha', 'は', 'ハ', 'ha', 'Japanese ha.ogg'],
  ['hi', 'ひ', 'ヒ', 'hi', 'Japanese hi.ogg'],
  ['fu', 'ふ', 'フ', 'fu', 'Japanese hu.ogg'],
  ['he', 'へ', 'ヘ', 'he', 'Japanese he.ogg'],
  ['ho', 'ほ', 'ホ', 'ho', 'Japanese ho.ogg'],
  ['ma', 'ま', 'マ', 'ma', 'Japanese ma.ogg'],
  ['mi', 'み', 'ミ', 'mi', 'Japanese mi.ogg'],
  ['mu', 'む', 'ム', 'mu', 'Japanese mu.ogg'],
  ['me', 'め', 'メ', 'me', 'Japanese me.ogg'],
  ['mo', 'も', 'モ', 'mo', 'Japanese mo.ogg'],
  ['ya', 'や', 'ヤ', 'ya', 'Japanese ya.ogg'],
  ['yu', 'ゆ', 'ユ', 'yu', 'Japanese yu.ogg'],
  ['yo', 'よ', 'ヨ', 'yo', 'Japanese yo.ogg'],
  ['ra', 'ら', 'ラ', 'ra', 'Japanese ra.ogg'],
  ['ri', 'り', 'リ', 'ri', 'Japanese ri.ogg'],
  ['ru', 'る', 'ル', 'ru', 'Japanese ru.ogg'],
  ['re', 'れ', 'レ', 're', 'Japanese re.ogg'],
  ['ro', 'ろ', 'ロ', 'ro', 'Japanese ro.ogg'],
  ['wa', 'わ', 'ワ', 'wa', 'Japanese wa.ogg'],
  ['wo', 'を', 'ヲ', 'wo', 'Japanese wo.ogg'],
  ['n', 'ん', 'ン', 'n', 'Japanese N.ogg'],
  ['ga', 'が', 'ガ', 'ga', 'Japanese ga.ogg'],
  ['gi', 'ぎ', 'ギ', 'gi', 'Japanese gi.ogg'],
  ['gu', 'ぐ', 'グ', 'gu', 'Japanese gu.ogg'],
  ['ge', 'げ', 'ゲ', 'ge', 'Japanese ge.ogg'],
  ['go', 'ご', 'ゴ', 'go', 'Japanese go.ogg'],
  ['za', 'ざ', 'ザ', 'za', 'Japanese za.ogg'],
  ['ji', 'じ', 'ジ', 'ji', 'Japanese zi.ogg'],
  ['zu', 'ず', 'ズ', 'zu', 'Japanese zu.ogg'],
  ['ze', 'ぜ', 'ゼ', 'ze', 'Japanese ze.ogg'],
  ['zo', 'ぞ', 'ゾ', 'zo', 'Japanese zo.ogg'],
  ['da', 'だ', 'ダ', 'da', 'Japanese da.ogg'],
  ['di', 'ぢ', 'ヂ', 'ji', 'Japanese di.ogg'],
  ['du', 'づ', 'ヅ', 'zu', 'Japanese du.ogg'],
  ['de', 'で', 'デ', 'de', 'Japanese de.ogg'],
  ['do', 'ど', 'ド', 'do', 'Japanese do.ogg'],
  ['ba', 'ば', 'バ', 'ba', 'Japanese ba.ogg'],
  ['bi', 'び', 'ビ', 'bi', 'Japanese bi.ogg'],
  ['bu', 'ぶ', 'ブ', 'bu', 'Japanese bu.ogg'],
  ['be', 'べ', 'ベ', 'be', 'Japanese be.ogg'],
  ['bo', 'ぼ', 'ボ', 'bo', 'Japanese bo.ogg'],
  ['pa', 'ぱ', 'パ', 'pa', 'Japanese pa.ogg'],
  ['pi', 'ぴ', 'ピ', 'pi', 'Japanese pi.ogg'],
  ['pu', 'ぷ', 'プ', 'pu', 'Japanese pu.ogg'],
  ['pe', 'ぺ', 'ペ', 'pe', 'Japanese pe.ogg'],
  ['po', 'ぽ', 'ポ', 'po', 'Japanese po.ogg'],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stripHtml = (s) => (s ?? '').replace(/<[^>]+>/g, '').trim()

// Wikimedia rate-limits bursts (HTTP 429). Retry politely, honoring Retry-After.
async function politeFetch(url, attempts = 6) {
  for (let i = 0; ; i++) {
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) })
    } catch (err) {
      // Network error or timeout: treat like a retryable failure.
      if (i >= attempts - 1) throw err
      console.log(`    ${err.name}, retrying`)
      await sleep(2000 * 2 ** i)
      continue
    }
    if (res.status !== 429 && res.status < 500) return res
    if (i >= attempts - 1) return res
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait = Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** i, 120_000)
    console.log(`    ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
    await sleep(wait)
  }
}

async function fetchMetadata(titles) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: titles.map((t) => `File:${t}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|sha1|size|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|UsageTerms',
  })
  const res = await politeFetch(`${API}?${params}`)
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  const data = await res.json()
  // Map normalized titles back to what we asked for.
  const norm = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]))
  const out = new Map()
  for (const page of Object.values(data.query.pages)) {
    const asked = (norm.get(page.title) ?? page.title).replace(/^File:/, '')
    out.set(asked, page)
  }
  return out
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const meta = new Map()
  for (let i = 0; i < KANA.length; i += 40) {
    const batch = KANA.slice(i, i + 40).map((k) => k[4])
    for (const [k, v] of await fetchMetadata(batch)) meta.set(k, v)
    await sleep(500)
  }

  const records = []
  const missing = []
  // attribution.json is rewritten after every file, so an interrupted run still
  // leaves a correct record of what is on disk (the app uses TTS for the rest).
  const saveAttribution = () =>
    writeFile(
      path.join(OUT_DIR, 'attribution.json'),
      JSON.stringify(
        {
          description:
            'Kana pronunciation recordings bundled with the app. Fetched and license-checked by tools/fetch-kana-audio/fetch.mjs.',
          retrieved: new Date().toISOString().slice(0, 10),
          complete: missing.length === 0 && records.length === KANA.length,
          missing,
          files: records,
        },
        null,
        2,
      ) + '\n',
    )

  for (const [key, hira, kata, romaji, title] of KANA) {
    const page = meta.get(title)
    if (!page || page.missing !== undefined || !page.imageinfo) {
      throw new Error(`Missing on Commons: ${title}`)
    }
    const info = page.imageinfo[0]
    const m = info.extmetadata ?? {}
    const license = stripHtml(m.LicenseShortName?.value)
    if (!ALLOWED_LICENSES.some((re) => re.test(license))) {
      throw new Error(`License not allowed for ${title}: "${license}"`)
    }

    const file = `${key}.ogg`
    const dest = path.join(OUT_DIR, file)
    const sha1Of = (b) => createHash('sha1').update(b).digest('hex')

    // Resume: keep a file that is already downloaded and matches Commons.
    let buf = await readFile(dest).catch(() => null)
    const cached = buf && sha1Of(buf) === info.sha1
    if (!cached) {
      const res = await politeFetch(info.url.split('?')[0]).catch((e) => ({ ok: false, status: e.name }))
      const data = res.ok ? Buffer.from(await res.arrayBuffer()) : null
      if (!data || sha1Of(data) !== info.sha1) {
        console.log(`FAIL ${hira} ${key}: ${data ? 'SHA-1 mismatch' : `HTTP ${res.status}`} (will use TTS; re-run later)`)
        missing.push(key)
        await saveAttribution()
        continue
      }
      buf = data
      await writeFile(dest, buf)
    }
    records.push({
      key,
      hiragana: hira,
      katakana: kata,
      romaji,
      file,
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${title}`.replace(/ /g, '_'))}`,
      sourceTitle: `File:${title}`,
      author: stripHtml(m.Artist?.value),
      license,
      licenseUrl: m.LicenseUrl?.value ?? null,
      sha1: info.sha1,
      bytes: buf.length,
    })
    await saveAttribution()
    console.log(`${cached ? 'had' : 'ok '} ${hira} ${key.padEnd(4)} ${license.padEnd(14)} ${title}`)
    if (!cached) await sleep(1500)
  }

  console.log(`\n${records.length}/${KANA.length} files in ${path.relative(ROOT, OUT_DIR)}${missing.length ? `; missing: ${missing.join(', ')} (re-run to retry)` : ''}`)
  if (missing.length) process.exitCode = 1
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`)
  process.exit(1)
})
