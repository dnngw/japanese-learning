# Third-Party Notices

The application **source code** is MIT-licensed (see [LICENSE](LICENSE)).
The app also bundles data, fonts and audio made by other people. Each keeps its
own license, listed below. Full license texts are in [licenses/](licenses/).

The same credits must be shown inside the app on the **About → Sources** screen
(required by the EDRDG licence; a launch/splash screen is not enough).

Licenses were last verified on 2026-11-12.

## Summary

| Component | Used for | Copyright holder | License | Full text |
|---|---|---|---|---|
| JMdict | Word meanings, readings, parts of speech | EDRDG | CC BY-SA 4.0 | [CC-BY-SA-4.0.txt](licenses/CC-BY-SA-4.0.txt) |
| KANJIDIC2 | Kanji meanings, on/kun readings, stroke counts | EDRDG | CC BY-SA 4.0 | [CC-BY-SA-4.0.txt](licenses/CC-BY-SA-4.0.txt) |
| jmdict-simplified | JSON conversion of JMdict / KANJIDIC2 (build input) | scriptin (GitHub) | CC BY-SA 4.0 | [CC-BY-SA-4.0.txt](licenses/CC-BY-SA-4.0.txt) |
| JmdictFurigana | Per-kanji furigana alignment | Doublevil | CC BY-SA (same as JMdict) | [CC-BY-SA-4.0.txt](licenses/CC-BY-SA-4.0.txt) |
| yomitan-jlpt-vocab | JLPT level per JMdict entry | stephenmk | CC BY-SA 4.0 | [CC-BY-SA-4.0.txt](licenses/CC-BY-SA-4.0.txt) |
| JLPT lists (upstream of the above) | Original JLPT word lists | Jonathan Waller (tanos.co.uk) | CC BY | — |
| KanjiVG | Stroke order for kanji and kana | Ulrich Apel | CC BY-SA 3.0 | [CC-BY-SA-3.0.txt](licenses/CC-BY-SA-3.0.txt) |
| mecab-ipadic 2.7.0 (inside kuromoji) | Tokenizer dictionary | Nara Institute of Science and Technology (NAIST); ICOT | NAIST/ICOT notice | [IPADIC-NOTICE.txt](licenses/IPADIC-NOTICE.txt) |
| kuromoji.js | Japanese tokenizer | Takuya Asano and contributors | Apache-2.0 | [Apache-2.0.txt](licenses/Apache-2.0.txt) |
| Noto Sans JP, Noto Serif JP | Japanese fonts | Google | SIL OFL 1.1 | [OFL-1.1.txt](licenses/OFL-1.1.txt) |
| Kana pronunciation audio | Kana module audio | Hakatanoshio117117 (Wikimedia Commons) | Public domain | [attribution.json](assets/audio/kana/attribution.json) |

## Required attribution text

The About → Sources screen shows this text with working links:

> This application uses the **JMdict** and **KANJIDIC2** dictionary files. These
> files are the property of the
> [Electronic Dictionary Research and Development Group](https://www.edrdg.org/),
> and are used in conformance with the Group's
> [licence](https://www.edrdg.org/edrdg/licence.html).
> Project pages: [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project),
> [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project).
>
> Furigana alignment from [JmdictFurigana](https://github.com/Doublevil/JmdictFurigana)
> by Doublevil (CC BY-SA). JSON conversion by
> [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) (CC BY-SA 4.0).
>
> JLPT levels from [yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab)
> by stephenmk (CC BY-SA 4.0), based on
> [Jonathan Waller's JLPT Resources](http://www.tanos.co.uk/jlpt/) (CC BY).
> JLPT has no official vocabulary list; levels are estimates.
>
> Stroke order data from [KanjiVG](https://kanjivg.tagaini.net/), copyright
> Ulrich Apel, CC BY-SA 3.0.
>
> Tokenizer: [kuromoji.js](https://github.com/takuyaa/kuromoji.js) (Apache-2.0)
> with mecab-ipadic, copyright Nara Institute of Science and Technology.
>
> Fonts: Noto Sans JP and Noto Serif JP, SIL Open Font License 1.1.
>
> Kana audio recorded by Hakatanoshio117117 and released into the public domain
> on [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Audio_files_of_hiragana_(set_by_Hakatanoshio117117)).

## Details and obligations

### JMdict and KANJIDIC2 (EDRDG)

- License: CC BY-SA 4.0 — <https://www.edrdg.org/edrdg/licence.html>
- Acknowledge the source in the docs, the website and the in-app About/Sources screen.
- Ship the licence file with the app (`licenses/CC-BY-SA-4.0.txt`) and link to the EDRDG licence page.
- **Do not claim copyright** over dictionary content.
- **Keep the data up to date.** The EDRDG licence requires a procedure for
  regularly updating to the latest dictionary version. This project rebuilds
  `dict.db` from the latest release on every app release and on a monthly CI
  schedule, and the About screen shows the dictionary version and build date.
- Commercial use is allowed; donations to EDRDG are suggested if the app ever earns money.

### dict.db (our derived database)

`dict.db` is built from JMdict, KANJIDIC2, JmdictFurigana and yomitan-jlpt-vocab.
It is an adaptation of CC BY-SA material and is therefore distributed under
**CC BY-SA 4.0**. This is stated in its `meta` table and in each release's notes.
Anyone may reuse it under the same terms.

### JmdictFurigana

The repository's `LICENSE` file is MIT (for the generator code), but its README
states: *"This resource is distributed under the same licence as JMDict
(Creative Commons Attribution-ShareAlike Licence)."* We treat the furigana data
as CC BY-SA 4.0.

### JLPT levels

`yomitan-jlpt-vocab` (CC BY-SA 4.0) maps Jonathan Waller's lists to JMdict entry
IDs. Waller's lists are published under CC BY. Both are credited. We do not use
`jlpt-word-list` (MIT): it is derived from the same CC BY lists and relabels them
as MIT, so its license chain is unclear.

### KanjiVG

- License: CC BY-SA 3.0 — <https://kanjivg.tagaini.net/>
- KanjiVG asks users to state their use of KanjiVG in their own copyright header
  and link to its website. Kana SVG files are kept **unmodified, with their
  original copyright comment**, in [assets/kanjivg/svg/](assets/kanjivg/svg/)
  (not merged into `dict.db`).
- The app uses stroke paths extracted from those files
  ([src/renderer/data/kana-strokes.json](src/renderer/data/kana-strokes.json)),
  an adaptation distributed under the same CC BY-SA 3.0 license, with the
  attribution stored inside the file. Both are produced by
  [tools/fetch-kanjivg/fetch.mjs](tools/fetch-kanjivg/fetch.mjs).

### mecab-ipadic (bundled inside kuromoji)

kuromoji ships a compiled copy of mecab-ipadic-2.7.0-20070801. Its notice must be
included with every copy: see [licenses/IPADIC-NOTICE.txt](licenses/IPADIC-NOTICE.txt)
(copied unchanged from kuromoji's `NOTICE.md`).

### Noto fonts

SIL Open Font License 1.1. Fonts may be bundled and redistributed; they must not
be sold on their own, and a modified font must not use the name "Noto".

### Kana audio (Wikimedia Commons)

- 71 recordings (gojūon, dakuten, handakuten) by Commons user
  **Hakatanoshio117117**, released into the public domain (`PD-self`).
- Every file's source page, author, license and SHA-1 is recorded in
  [assets/audio/kana/attribution.json](assets/audio/kana/attribution.json),
  produced by [tools/fetch-kana-audio/fetch.mjs](tools/fetch-kana-audio/fetch.mjs),
  which refuses any file whose Commons license is not on its allowlist.
- Attribution is not legally required for public-domain files, but is given anyway.
- Katakana uses the same recordings as hiragana.
- Not covered by this set: yōon (きゃ, しゅ, ちょ, …). See
  [assets/audio/kana/README.md](assets/audio/kana/README.md).

### Data exported by users (Anki .apkg / CSV)

Exports contain JMdict meanings, so each exported deck includes this line in its
description: *"Definitions from JMdict (EDRDG), CC BY-SA 4.0 —
https://www.edrdg.org/edrdg/licence.html"*.

### Content written for this project

Example words for each kana ([src/renderer/data/kanaExamples.js](src/renderer/data/kanaExamples.js)),
the sample reading text and all UI text were written for this project and are
covered by the MIT license.

## npm dependencies

Everything shipped inside the app (production dependencies, including indirect
ones) uses a permissive license. Checked with `npm run licenses:check`
on 2026-11-12: 28 MIT, 2 Apache-2.0, 1 OFL-1.1, 1 BSD-3-Clause, 1 0BSD.

| License | Packages shipped in the app |
|---|---|
| MIT | react, react-dom, react-router, @tanstack/react-query, zod, better-sqlite3, wanakana, ts-fsrs, @open-spaced-repetition/binding (FSRS optimizer), fflate, @emnapi/*, @napi-rs/wasm-runtime, @tybys/wasm-util, and their dependencies |
| Apache-2.0 | drizzle-orm, kuromoji |
| BSD-3-Clause | @open-spaced-repetition/srs-kit (used by ts-fsrs) |
| 0BSD | tslib |
| OFL-1.1 | @fontsource/noto-sans-jp |

The full license text of every one of these packages is collected into
[licenses/THIRD_PARTY_LICENSES.txt](licenses/THIRD_PARTY_LICENSES.txt) by
`npm run licenses:collect` (run automatically by `npm run dist`) and shipped in
the app's `legal/` folder.

Build-only tools (electron, electron-vite, electron-builder, vite, tailwindcss,
drizzle-kit, vitest, eslint, playwright-core) are not shipped as code, except
Electron itself: electron-builder includes Electron's and Chromium's license
files (`LICENSE.electron.txt`, `LICENSES.chromium.html`) in every build.
