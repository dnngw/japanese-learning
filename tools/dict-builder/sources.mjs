// Data sources for dict.db. Each is resolved to its latest GitHub release at
// build time (the EDRDG licence requires keeping JMdict up to date).
// Licenses are documented in THIRD_PARTY_NOTICES.md.

export const SOURCES = {
  jmdict: {
    repo: 'scriptin/jmdict-simplified',
    asset: /^jmdict-eng-\d.*\.json\.zip$/,
    license: 'CC BY-SA 4.0 (EDRDG)',
  },
  kanjidic: {
    repo: 'scriptin/jmdict-simplified',
    asset: /^kanjidic2-en-\d.*\.json\.zip$/,
    license: 'CC BY-SA 4.0 (EDRDG)',
  },
  furigana: {
    repo: 'Doublevil/JmdictFurigana',
    asset: /^JmdictFurigana\.json\.zip$/,
    license: 'CC BY-SA (same as JMdict)',
  },
  jlpt: {
    repo: 'stephenmk/yomitan-jlpt-vocab',
    asset: /^jlpt\.zip$/,
    license: 'CC BY-SA 4.0 (based on Jonathan Waller, CC BY)',
  },
}
