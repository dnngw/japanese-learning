# Kana audio

Source: Wikimedia Commons set
[Audio files of hiragana (set by Hakatanoshio117117)](https://commons.wikimedia.org/wiki/Category:Audio_files_of_hiragana_(set_by_Hakatanoshio117117)),
plus `Japanese ka.ogg` and `Japanese so.ogg` by the same uploader (not in the category).
All files are released into the **public domain** (`PD-self`) by the author.

- 71 files: 46 basic kana, 20 dakuten, 5 handakuten. Ogg Vorbis, unmodified.
- `attribution.json`: per-file source page, author, license, SHA-1.
- Re-download and re-verify: `node tools/fetch-kana-audio/fetch.mjs`
- Katakana plays the same file as the matching hiragana.
- File names: `di.ogg` = ぢ, `du.ogg` = づ (shown as "ji"/"zu" in the UI).

## Not covered

- **Yōon** (きゃ, しゅ, ちょ, … 33 sounds): no matching recordings exist on Commons
  (checked 2026-11-12). Until we have them, the app uses system TTS (ja-JP) for yōon.
  Plan: record them ourselves, release as CC0, upload to Commons, add here.
- っ (small tsu) and ー (long vowel) have no sound of their own; they are taught
  with example words.
