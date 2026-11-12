# JapanLearn

*Read first, memorize later.* A free, open-source desktop app for learning
Japanese by reading. Paste lyrics, an article or open a subtitle file; the app
adds furigana, tells you how much of the text you already know, lets you save
new words with the sentence you found them in, and schedules reviews with FSRS.

Everything runs offline. Texts you paste never leave your computer.

## What it does

| Module | Features |
|---|---|
| **First start** | Choose your level (no kana yet, forgot some kana, can read kana, N5–N2) and a daily goal. Basic vocabulary for your level can be marked as known (undo in Settings). |
| **Reader** | Paste text or open `.srt` / `.vtt` / `.ass` / `.txt` (UTF-8, Shift_JIS, EUC-JP, UTF-16). Per-kanji furigana (toggle), click a word for its English meaning from JMdict, comprehension score ("86% known"), JLPT estimate, most frequent new words. Texts are kept in a library. |
| **Words** | Conjugated forms are merged (食べた, 食べます → 食べる). Every sentence (and subtitle timestamp) is kept. Search, filter, edit your own meaning and notes. |
| **Review** | FSRS scheduling (Again / Hard / Good / Easy, keys 1–4) shown in the word's own sentence. Every answer is logged; with 400+ reviews the FSRS parameters can be optimized to your memory. Words you know well stop being highlighted in the reader. |
| **Practice** | Meaning quiz (distractors of the same part of speech and level), reading quiz, fill-the-gap from your sentences, dictation (system TTS), word order. Optionally counts toward reviews. |
| **Kana** | Hiragana/katakana table with recorded audio (TTS for yōon), animated stroke order, example words and your own memory aids. Learn row by row with a quiz, quizzes, look-alike drills (シ/ツ, ぬ/め…), tracing with stroke checking, and a refresh test that only schedules what you miss. |
| **Statistics** | Reviews per day, accuracy, retention, streak, new words per week, upcoming reviews. |
| **Your data** | Export to CSV or Anki (`.apkg`), full JSON backup and restore, database copy. |

## Getting started (development)

Requires Node 22+.

```bash
npm install          # npm may ask to approve install scripts for better-sqlite3 and esbuild
npm run dict:build   # download JMdict etc. and build resources/dict.db (~80 MB, ~10 s)
npm run dev          # start the app with hot reload
```

The kana audio (`assets/audio/kana/`) and stroke data (`assets/kanjivg/`,
`src/renderer/data/kana-strokes.json`) are committed. To refresh them:
`npm run fetch:kana-audio` and `npm run fetch:kanjivg`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the app in development |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:e2e` | Build, launch the app and click through every main flow (Playwright) |
| `npm run test:packaged` | Same, against an unpacked production build (security fuses on, except `--inspect`) |
| `npm run lint` | ESLint, including React hooks rules |
| `npm run db:generate` | Create a migration after changing `src/main/models/schema.js` |
| `npm run dict:build` | Rebuild `resources/dict.db` from the latest dictionary releases |
| `npm run licenses:check` | Fail if a shipped dependency has a license outside the allow list |
| `npm run dist` | Build the dictionary, collect licenses, and package installers into `dist/` |

## Project structure (MVC)

```
src/
  main/                  Electron main process
    models/              MODEL: Drizzle schema + data access (user.db), read-only dict.db
    services/            Logic: tokenizer, furigana, scoring, FSRS, practice, kana, export, stats
    controllers/         CONTROLLER: IPC handlers; every input validated with zod
    index.js             Window, security settings, startup
  preload/index.js       window.api: the only bridge between UI and main process
  renderer/              VIEW: React
    views/               Pages
    components/          Reusable UI (ruby text, stroke animation, trace pad, charts…)
    contexts/            React Context (reader display preferences)
    queries/             TanStack Query hooks calling window.api
  shared/                Data used by both sides (kana tables)
drizzle/                 SQL migrations, applied automatically on startup
resources/dict.db        Built dictionary (not committed)
assets/                  Kana audio, KanjiVG SVGs
tools/                   Build scripts (dictionary, kana audio, KanjiVG, licenses)
tests/                   Vitest tests + Playwright end-to-end test
```

## Privacy and security

- No network access at runtime. The only network use is at build time
  (dictionary and asset downloads) and links you click on the About page,
  which open in your browser.
- The renderer runs sandboxed with context isolation and a strict Content
  Security Policy; it cannot navigate away from the app.
- Packaged builds flip Electron's security fuses: the app binary can't be used
  as a Node runtime (`ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, `--inspect` are
  disabled) and it refuses to start if its code (`app.asar`) was modified.
  `npm run test:packaged` builds a copy that only re-enables `--inspect`, so
  Playwright can drive it.

## Known limitations

- Yōon (きゃ, しゅ…) have no recorded audio yet; the app uses your system's
  Japanese text-to-speech voice. Dictation also needs such a voice. macOS and
  Windows include one (it may need to be enabled in system settings); on Linux,
  text-to-speech may not be available, and the app then hides those features.
- The JLPT level estimate is based on unofficial word lists.
- Installers are not code-signed yet: macOS Gatekeeper and Windows SmartScreen
  will warn on first launch.

## License

Code: MIT ([LICENSE](LICENSE)). Dictionary data, stroke order data, fonts and
audio have their own licenses: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
and [docs/licensing-policy.md](docs/licensing-policy.md).
