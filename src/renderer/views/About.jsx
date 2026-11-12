import { useAppInfo } from '../queries/app.js'

// Required by the EDRDG licence: sources must be credited on a screen reachable
// from the menu (see THIRD_PARTY_NOTICES.md). Keep this in sync with that file.

// Optional at build time: present once tools/fetch-kana-audio has run.
const attributionModule = Object.values(
  import.meta.glob('../../../assets/audio/kana/attribution.json', { eager: true, import: 'default' }),
)[0]

const SOURCES = [
  {
    name: 'JMdict and KANJIDIC2',
    license: 'CC BY-SA 4.0',
    text: 'This application uses the JMdict and KANJIDIC2 dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group’s licence.',
    links: [
      ['EDRDG licence', 'https://www.edrdg.org/edrdg/licence.html'],
      ['JMdict project', 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project'],
      ['KANJIDIC project', 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project'],
    ],
  },
  {
    name: 'JmdictFurigana',
    license: 'CC BY-SA',
    text: 'Per-kanji furigana alignment by Doublevil.',
    links: [['GitHub', 'https://github.com/Doublevil/JmdictFurigana']],
  },
  {
    name: 'jmdict-simplified',
    license: 'CC BY-SA 4.0',
    text: 'JSON conversion of JMdict and KANJIDIC2.',
    links: [['GitHub', 'https://github.com/scriptin/jmdict-simplified']],
  },
  {
    name: 'JLPT levels',
    license: 'CC BY-SA 4.0 / CC BY',
    text: 'yomitan-jlpt-vocab by stephenmk, based on Jonathan Waller’s JLPT Resources. JLPT has no official vocabulary list; levels are estimates.',
    links: [
      ['yomitan-jlpt-vocab', 'https://github.com/stephenmk/yomitan-jlpt-vocab'],
      ['tanos.co.uk', 'http://www.tanos.co.uk/jlpt/'],
    ],
  },
  {
    name: 'KanjiVG',
    license: 'CC BY-SA 3.0',
    text: 'Stroke order data, copyright Ulrich Apel.',
    links: [['kanjivg.tagaini.net', 'https://kanjivg.tagaini.net/']],
  },
  {
    name: 'kuromoji.js and mecab-ipadic',
    license: 'Apache-2.0 / NAIST',
    text: 'Japanese tokenizer by Takuya Asano, with mecab-ipadic, copyright Nara Institute of Science and Technology.',
    links: [['GitHub', 'https://github.com/takuyaa/kuromoji.js']],
  },
  {
    name: 'Noto Sans JP',
    license: 'SIL OFL 1.1',
    text: 'Japanese font by Google.',
    links: [['Open Font License', 'https://openfontlicense.org/']],
  },
  {
    name: 'Kana audio',
    license: 'Public domain',
    text: 'Recorded by Hakatanoshio117117 and released into the public domain on Wikimedia Commons.',
    links: [
      [
        'Wikimedia Commons',
        'https://commons.wikimedia.org/wiki/Category:Audio_files_of_hiragana_(set_by_Hakatanoshio117117)',
      ],
    ],
  },
]

export default function About() {
  const { data: info } = useAppInfo()

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">About</h1>
      {info && (
        <p className="mt-1 text-sm text-muted">
          {info.name} {info.version} · Electron {info.electron} · Dictionary:{' '}
          {info.dictionary ? `JMdict ${info.dictionary.jmdictDate} (${info.dictionary.license})` : 'not installed'}
        </p>
      )}
      <p className="mt-4 text-sm">
        Free and open source (MIT). Everything runs on your device; texts you paste are never sent anywhere.
      </p>

      <h2 className="mt-8 text-lg font-bold">Sources</h2>
      <ul className="mt-3 space-y-3">
        {SOURCES.map((s) => (
          <li key={s.name} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{s.name}</span>
              <span className="shrink-0 text-xs text-muted">{s.license}</span>
            </div>
            <p className="mt-1 text-sm">{s.text}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {s.links.map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" className="text-accent underline">
                  {label}
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {attributionModule && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-muted">
            Kana audio files ({attributionModule.files.length}, retrieved {attributionModule.retrieved})
          </summary>
          <ul className="mt-2 columns-2 text-xs">
            {attributionModule.files.map((f) => (
              <li key={f.key}>
                {f.hiragana}{' '}
                <a href={f.source} target="_blank" rel="noreferrer" className="text-accent underline">
                  {f.sourceTitle}
                </a>{' '}
                · {f.author} · {f.license}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
