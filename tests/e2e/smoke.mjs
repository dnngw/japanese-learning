// End-to-end test: launches the built app (run `npm run build` first) with a fresh
// profile and walks through every main flow like a user would.
// Usage: node tests/e2e/smoke.mjs   (screenshots → $SCREENSHOT_DIR or ./out/shots)

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron } from 'playwright-core'
import { toRomaji } from 'wanakana'
import { ALL_KANA } from '../../src/shared/kana.js'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '../..')
const SHOTS = process.env.SCREENSHOT_DIR || path.join(ROOT, 'out/shots')
mkdirSync(SHOTS, { recursive: true })
const tmp = mkdtempSync(path.join(os.tmpdir(), 'japanlearn-e2e-'))
const profile = path.join(tmp, 'profile')

const problems = []
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) problems.push(label)
}

// Editor-hosted shells may export ELECTRON_RUN_AS_NODE, which makes Electron start as plain Node.
const env = { ...process.env, JAPANLEARN_USER_DATA: profile }
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_RENDERER_URL

// --packaged (or APP_EXECUTABLE=<path>) tests the unpacked build from `electron-builder --dir`
// instead of the dev build. That build must allow --inspect (see npm run test:packaged).
const PACKAGED_BIN = {
  darwin: `dist/mac${process.arch === 'arm64' ? '-arm64' : ''}/JapanLearn.app/Contents/MacOS/JapanLearn`,
  win32: 'dist/win-unpacked/JapanLearn.exe',
  linux: 'dist/linux-unpacked/japanlearn',
}[process.platform]
const packaged = process.env.APP_EXECUTABLE ?? (process.argv.includes('--packaged') ? path.join(ROOT, PACKAGED_BIN) : undefined)
const app = await electron.launch({ executablePath: packaged ?? require('electron'), args: packaged ? [] : [ROOT], env, timeout: 30_000 })
if (packaged) console.log(`Testing packaged app: ${packaged}`)
const page = await app.firstWindow()
await page.setViewportSize({ width: 1280, height: 860 }).catch(() => {})
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(e.message))
page.on('dialog', (d) => d.accept()) // window.confirm → OK
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
const nav = (label) => page.locator('nav a', { hasText: label }).first().click()
const button = (name) => page.getByRole('button', { name, exact: true }).first()

// Native file dialogs can't be clicked: answer them from the main process.
async function stubDialogs(savePath, openPath) {
  await app.evaluate(({ dialog }, [save, open]) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: save })
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: open ? [open] : [] })
  }, [savePath, openPath])
}

try {
  // ---------- Onboarding ----------
  await page.waitForSelector('text=Welcome to JapanLearn', { timeout: 20_000 })
  check(true, 'first launch shows onboarding')
  await page.getByRole('radio', { name: /I know most N5 words/ }).click()
  await button('10').click()
  await shot('01-welcome')
  await button('Start').click()
  await page.waitForSelector('text=Your texts', { timeout: 20_000 })
  check(true, 'onboarding (N5, mark known) leads to the reader library')

  // ---------- Reader: paste ----------
  await button('Use sample text').click()
  await button('Read').click()
  await page.waitForSelector('article ruby', { timeout: 20_000 })
  const rubies = await page.$$eval('article ruby', (els) => els.map((e) => e.textContent))
  check(rubies.includes('起お') && rubies.includes('日本にほん'), 'per-kanji furigana rendered (起[お], 日本[にほん]語[ご])')
  const score = await page.textContent('[data-testid=score]')
  check(!/^0%/.test(score.trim()), `N5 words count as known: "${score.trim()}"`)
  const unknown = page.locator('article span.decoration-unknown').first()
  const unknownText = await unknown.innerText()
  await unknown.click()
  await page.waitForSelector('aside ol li', { timeout: 10_000 })
  check(true, `meaning shown for new word ${unknownText.replace(/\s+/g, '')}`)
  await button('Save to learn').click()
  await page.waitForSelector('article span.bg-learning', { timeout: 10_000 })
  check(true, 'saved word is highlighted as learning')
  await shot('02-reader')

  // ---------- Reader: subtitle import ----------
  await nav('Reader')
  const srt = path.join(tmp, 'drama ep1.srt')
  writeFileSync(srt, '1\n00:00:01,000 --> 00:00:03,000\n猫が窓の外を見ている。\n\n2\n00:01:05,500 --> 00:01:08,000\n<i>雨が降りそうだね。</i>\n')
  await page.setInputFiles('[data-testid=file-input]', srt)
  await page.waitForSelector('text=1:05', { timeout: 20_000 })
  check(await page.isVisible('h1:has-text("drama ep1")'), 'subtitle imported with title and timestamps (1:05)')
  await nav('Reader')
  await page.waitForSelector('ul li:nth-child(2)', { timeout: 5_000 })
  check((await page.locator('ul li').count()) === 2, 'library lists both texts')

  // ---------- Review ----------
  await nav('Review')
  await page.waitForSelector('text=Show answer', { timeout: 10_000 })
  await page.keyboard.press('Space')
  const good = await page.locator('button', { hasText: 'Good' }).textContent()
  check(/\d+m/.test(good), `review shows FSRS intervals ("${good}")`)
  await page.keyboard.press('3')
  await page.waitForSelector('text=Learning', { timeout: 10_000 })
  await page.keyboard.press('Space')
  await page.locator('button', { hasText: 'Easy' }).click()
  await page.waitForSelector('text=All done for now', { timeout: 10_000 })
  check(true, 'review queue completed')

  // ---------- Words ----------
  await nav('Words')
  await page.waitForSelector('ul li', { timeout: 10_000 })
  await button('Edit').click()
  await page.getByLabel(/My meaning/).fill('my own meaning')
  await button('Save').click()
  await page.waitForSelector('text=my own meaning')
  await page.getByPlaceholder(/Search word/).fill('my own')
  await page.waitForTimeout(500)
  check((await page.locator('ul > li').count()) === 1, 'custom meaning saved and searchable')
  await page.getByRole('tab', { name: /Known/ }).click()
  await page.waitForTimeout(300)
  await page.getByPlaceholder(/Search word/).fill('')
  await page.waitForSelector('text=/\\d+ \\/ \\d+/', { timeout: 5_000 })
  check(true, 'known words (from onboarding) are paged')
  await shot('03-words')

  // ---------- Practice ----------
  await nav('Practice')
  await button('5').click()
  await page.locator('button', { hasText: 'See a word, pick its meaning' }).click()
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('text=/\\d+ \\/ 5/')
    await page.keyboard.press('1')
    await page.waitForSelector('text=/Correct!|Not quite/')
    if (i === 0) await shot('04-practice')
    await page.keyboard.press('Enter')
  }
  await page.waitForSelector('text=Practice finished', { timeout: 10_000 })
  check(true, 'meaning practice session runs to the summary')
  await button('Choose another mode').click()
  await page.locator('button', { hasText: 'Put the parts of a sentence' }).click()
  const orderReady = await page.waitForSelector('[data-testid=order-chunks]', { timeout: 5_000 }).then(() => true, () => false)
  if (orderReady) {
    const chunks = page.locator('[data-testid=order-chunks] button')
    while ((await chunks.count()) > 0) await chunks.first().click()
    await button('Check').click()
    await page.waitForSelector('text=/Correct!|Not quite/')
    check(true, 'word-order question can be answered')
  } else {
    check(await page.isVisible('text=None of your words fit'), 'word-order shows a clear message when no sentence fits')
  }

  // ---------- Kana: learn a row ----------
  await nav('Kana')
  await page.getByRole('tab', { name: 'Learn' }).click()
  await page.locator('button', { hasText: 'あいうえお' }).click()
  for (let i = 0; i < 4; i++) await button('Next').click()
  await button('Quiz').click()
  for (let i = 0; i < 5; i++) {
    const char = await page.locator('.text-8xl').textContent()
    await page.locator('button', { has: page.locator(`span:text-is("${toRomaji(char)}")`) }).first().click()
    await button('Next').click()
  }
  await page.waitForSelector('text=Next row', { timeout: 5_000 })
  check(await page.isVisible('text=5 / 5'), 'kana lesson quiz: 5/5 and cards created')

  // ---------- Kana: write (draw stroke 1 of あ with the mouse) ----------
  await page.getByRole('tab', { name: 'Write' }).click()
  const pad = page.locator('[data-testid=trace-pad]')
  await pad.waitFor()
  const box = await pad.boundingBox()
  // Sample stroke 1 of あ from the faint guide path drawn in the pad.
  const stroke = await page.evaluate(() => {
    const p = document.querySelector('[data-testid=trace-pad] g path')
    const len = p.getTotalLength()
    return Array.from({ length: 30 }, (_, i) => {
      const q = p.getPointAtLength((len * i) / 29)
      return [q.x, q.y]
    })
  })
  const toScreen = ([x, y]) => [box.x + (x / 109) * box.width, box.y + (y / 109) * box.height]
  await page.mouse.move(...toScreen(stroke[0]))
  await page.mouse.down()
  for (const p of stroke.slice(1)) await page.mouse.move(...toScreen(p), { steps: 2 })
  await page.mouse.up()
  await page.waitForSelector('text=/Stroke 2 of 3/', { timeout: 5_000 })
  check(true, 'tracing: a correctly drawn stroke is accepted')
  // A reversed stroke must be rejected.
  const s2 = await page.evaluate(() => {
    const p = document.querySelectorAll('[data-testid=trace-pad] g')[0].querySelectorAll('path')[1]
    const len = p.getTotalLength()
    return Array.from({ length: 30 }, (_, i) => {
      const q = p.getPointAtLength((len * (29 - i)) / 29)
      return [q.x, q.y]
    })
  })
  await page.mouse.move(...toScreen(s2[0]))
  await page.mouse.down()
  for (const p of s2.slice(1)) await page.mouse.move(...toScreen(p), { steps: 2 })
  await page.mouse.up()
  await page.waitForSelector('text=/Wrong direction|Start the stroke/', { timeout: 5_000 })
  check(true, 'tracing: a reversed stroke is rejected')
  await shot('05-kana-write')

  // ---------- Kana: refresh test (katakana) ----------
  await page.getByRole('button', { name: 'Katakana' }).click()
  await page.getByRole('tab', { name: 'Refresh test' }).click()
  await button('Start test').click()
  for (let i = 0; i < 46; i++) {
    const char = (await page.locator('.text-8xl').textContent()).trim()
    const answer = i < 3 ? 'xx' : toRomaji(char) // miss the first three on purpose
    await page.getByPlaceholder('romaji + Enter').fill(answer)
    await page.keyboard.press('Enter')
  }
  await page.waitForSelector('text=Mastered', { timeout: 10_000 })
  const missedTile = await page.locator('div', { hasText: /^3Missed$/ }).count()
  check(missedTile > 0, 'refresh test: 3 missed, the rest mastered')
  await shot('06-kana-refresh')

  const audioKeys = ALL_KANA.filter((k) => k.audio).map((k) => k.key)
  const audioResults = await page.evaluate(
    (keys) =>
      Promise.all(
        keys.map(
          (key) =>
            new Promise((resolve) => {
              const a = new Audio(`audio/kana/${key}.ogg`)
              a.oncanplaythrough = () => resolve(null)
              a.onerror = () => resolve(key)
            }),
        ),
      ),
    audioKeys,
  )
  const broken = audioResults.filter(Boolean)
  check(broken.length === 0, `all ${audioKeys.length} kana recordings load${broken.length ? ` (broken: ${broken.join(', ')})` : ''}`)

  await page.getByRole('tab', { name: 'Special rules' }).click()
  const rulesShown = await page.getByRole('heading', { name: /double consonant/ }).waitFor({ timeout: 5_000 }).then(() => true, () => false)
  check(rulesShown && (await page.getByRole('heading', { name: /Particles/ }).isVisible()), 'kana special rules (っ, ー, particles) are shown')
  await shot('06b-kana-rules')

  // ---------- Review now includes kana ----------
  const badge = await page.locator('nav a[href="#/review"] span').textContent().catch(() => '0')
  check(Number(badge) > 0, `kana lessons added cards to the review queue (badge ${badge})`)

  // ---------- Statistics ----------
  await nav('Statistics')
  await page.waitForSelector('text=Reviews per day')
  const bars = page.locator('figure').first().locator('[role=listitem]')
  await bars.last().hover()
  check(await page.isVisible('figure >> text=/\\d+ (reviews)?/'), 'statistics charts render with hover tooltip')
  await shot('07-stats')

  // ---------- Settings: change, export, backup, restore ----------
  await nav('Settings')
  const perDay = page.getByLabel('New cards per day')
  await perDay.fill('25')
  await perDay.press('Enter')
  await page.waitForTimeout(300)
  const csv = path.join(tmp, 'words.csv')
  await stubDialogs(csv)
  await button('Export CSV').click()
  await page.waitForSelector('text=/Saved \\d+ words to .*words.csv/', { timeout: 10_000 })
  check(existsSync(csv) && readFileSync(csv, 'utf8').includes('my own meaning'), 'CSV export written')
  const apkg = path.join(tmp, 'deck.apkg')
  await stubDialogs(apkg)
  await button('Learning words').click()
  await page.waitForFunction(() => document.body.innerText.includes('deck.apkg'), null, { timeout: 10_000 })
  check(existsSync(apkg) && readFileSync(apkg).subarray(0, 2).toString() === 'PK', 'Anki .apkg export written')
  const backup = path.join(tmp, 'backup.json')
  await stubDialogs(backup)
  await button('Backup (.json)').click()
  await page.waitForFunction(() => document.body.innerText.includes('backup.json'), null, { timeout: 10_000 })
  await stubDialogs(null, backup)
  await button('Restore…').click()
  await page.waitForSelector('text=/Restored \\d+ words/', { timeout: 10_000 })
  check(true, 'backup restored')
  await page.reload()
  await page.waitForSelector('text=Daily study')
  check((await page.getByLabel('New cards per day').inputValue()) === '25', 'settings persist after reload')
  await shot('08-settings')

  // ---------- Native modules load (FSRS optimizer, SQLite) ----------
  const fsrs = await page.evaluate(() => window.api.fsrs.status())
  check(fsrs.available === true, 'FSRS optimizer native module loads')

  // ---------- Dark mode (visual check only) ----------
  await page.emulateMedia({ colorScheme: 'dark' })
  await nav('Reader')
  await page.locator('ul li a').first().click()
  await page.waitForSelector('article ruby')
  await shot('09-dark-reader')
  await nav('Kana')
  await shot('10-dark-kana')
  await page.emulateMedia({ colorScheme: 'light' })

  // ---------- About ----------
  await nav('About')
  await page.waitForSelector('text=Electronic Dictionary Research and Development Group')
  check(await page.isVisible('text=KanjiVG'), 'About lists sources and licenses')
} catch (err) {
  problems.push(err.message)
  console.log(`FAIL  ${err.message.split('\n')[0]}`)
  await shot('99-failure').catch(() => {})
} finally {
  const relevant = consoleErrors.filter((e) => !/Autofill/.test(e))
  check(relevant.length === 0, `no renderer console errors${relevant.length ? ': ' + relevant.join(' | ') : ''}`)
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
}

console.log(`\n${problems.length ? `${problems.length} problem(s)` : 'All checks passed'}. Screenshots: ${SHOTS}`)
process.exit(problems.length ? 1 : 0)
