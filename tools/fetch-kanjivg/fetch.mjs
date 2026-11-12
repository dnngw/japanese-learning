// Extracts kana stroke-order data from the latest KanjiVG release.
//
// Output (CC BY-SA 3.0, © Ulrich Apel, https://kanjivg.tagaini.net):
//   assets/kanjivg/svg/<hex>.svg   original SVG files, unmodified (copyright header kept)
//   src/renderer/data/kana-strokes.json   stroke paths + number positions, derived from the SVGs
//
// Usage: node tools/fetch-kanjivg/fetch.mjs

import { unzipSync } from 'fflate'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SVG_DIR = path.join(ROOT, 'assets/kanjivg/svg')
const JSON_OUT = path.join(ROOT, 'src/renderer/data/kana-strokes.json')
const UA = 'kanjivg-fetch/0.1 (open-source Japanese learning app build script)'

// Hiragana U+3041–3096, katakana U+30A1–30FA.
const isKana = (cp) => (cp >= 0x3041 && cp <= 0x3096) || (cp >= 0x30a1 && cp <= 0x30fa)

async function main() {
  const rel = await (await fetch('https://api.github.com/repos/KanjiVG/kanjivg/releases/latest', { headers: { 'User-Agent': UA } })).json()
  const asset = rel.assets.find((a) => /^kanjivg-\d+-main\.zip$/.test(a.name))
  if (!asset) throw new Error('kanjivg main zip not found in latest release')
  console.log(`Downloading ${asset.name} (${(asset.size / 1e6).toFixed(1)} MB)`)
  const zip = new Uint8Array(await (await fetch(asset.browser_download_url, { headers: { 'User-Agent': UA } })).arrayBuffer())

  const files = unzipSync(zip, {
    filter: (f) => {
      const m = /(?:^|\/)([0-9a-f]{5})\.svg$/.exec(f.name)
      return !!m && isKana(parseInt(m[1], 16))
    },
  })

  rmSync(SVG_DIR, { recursive: true, force: true })
  mkdirSync(SVG_DIR, { recursive: true })
  mkdirSync(path.dirname(JSON_OUT), { recursive: true })

  const strokes = {}
  const decoder = new TextDecoder()
  for (const [name, bytes] of Object.entries(files)) {
    const hex = /([0-9a-f]{5})\.svg$/.exec(name)[1]
    const svg = decoder.decode(bytes)
    writeFileSync(path.join(SVG_DIR, `${hex}.svg`), bytes)
    const paths = [...svg.matchAll(/<path\b[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"[^>]*\bd="([^"]+)"/g)]
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((m) => m[2])
    const numbers = [...svg.matchAll(/<text transform="matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)">(\d+)<\/text>/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
    ])
    if (paths.length) strokes[String.fromCodePoint(parseInt(hex, 16))] = { paths, numbers }
  }

  writeFileSync(
    JSON_OUT,
    JSON.stringify({
      source: `KanjiVG ${rel.tag_name}`,
      license: 'CC BY-SA 3.0',
      attribution: 'Stroke order data from KanjiVG, copyright Ulrich Apel, https://kanjivg.tagaini.net',
      viewBox: '0 0 109 109',
      strokes,
    }),
  )
  console.log(`${Object.keys(strokes).length} kana → ${path.relative(ROOT, SVG_DIR)} and ${path.relative(ROOT, JSON_OUT)}`)
}

main().catch((e) => {
  console.error(`FAILED: ${e.message}`)
  process.exit(1)
})
