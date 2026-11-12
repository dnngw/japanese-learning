# Licensing Policy

Goal: anyone can download, use, share, modify and redistribute this app for free,
without legal risk. Every dependency and asset must allow that.

## 1. What is allowed

### Code dependencies (npm)

Allowed: `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`,
`Unlicense`, `CC0-1.0`, `BlueOak-1.0.0`, `Python-2.0`.
`MPL-2.0` is allowed only for unmodified packages.

Not allowed: `GPL-*`, `AGPL-*`, `LGPL-*`, `SSPL`, `BUSL`, "Commons Clause", any
package with no license. These would force the whole bundled app under their
terms or restrict use.

### Data, images, audio, fonts

Allowed: Public domain, `CC0`, `CC BY`, `CC BY-SA`, `SIL OFL 1.1` (fonts only).

Not allowed:
- `NC` (NonCommercial) or `ND` (NoDerivatives) Creative Commons licenses.
- "Free for personal use", "for educational use only", or no stated license.
- Content copied from websites, apps or shared Anki decks (e.g. Forvo audio,
  commercial frequency lists, textbook audio), even if it is easy to download.
- AI-generated voice or images from services whose terms restrict redistribution.

## 2. Adding a new dependency or asset

1. Find the license **in the source itself** (LICENSE file, README, file header,
   Commons file page). If the README and LICENSE disagree, follow the stricter one.
2. Check where it came from. Derived data inherits the license of its source
   (e.g. anything built from JMdict is CC BY-SA).
3. Add it to [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md): name, holder,
   license, link, and what we use it for.
4. Add the full license text to `licenses/` if it is not there yet.
5. Add it to the in-app About → Sources screen.
6. For media files, record per-file attribution (author, source URL, license)
   in a JSON file next to the files, like `assets/audio/kana/attribution.json`.

## 3. Rules for specific sources

- **JMdict / KANJIDIC2 (EDRDG):** the app must have a way to stay up to date.
  - CI rebuilds `dict.db` from the latest jmdict-simplified release monthly and
    on every app release.
  - The About screen shows the dictionary version and build date.
  - Users can replace `dict.db` with a newer build (manual import, or an opt-in
    "check for dictionary update" that is off by default to keep the app offline).
- **CC BY-SA data:** anything we build from it (e.g. `dict.db`) is also CC BY-SA.
  Keep KanjiVG (CC BY-SA 3.0) files separate and unmodified, with their headers.
- **User data:** texts pasted by users stay on their device and are never bundled,
  uploaded or shared by the app.

## 4. Automated check in CI

```bash
npx license-checker-rseidelsohn --production --excludePrivatePackages \
  --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;Unlicense;CC0-1.0;BlueOak-1.0.0;Python-2.0;OFL-1.1;MPL-2.0"
```

The build fails if any production dependency has a license outside this list.
A full report (`--json`) is attached to each release.

## 5. Contributions

Contributors license their code under MIT by submitting it. Contributed audio,
images or mnemonics must be the contributor's own work released as CC0 or CC BY,
or come from a source that meets section 1, with attribution recorded.
