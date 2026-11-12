// Kana data shared by the main process (review cards) and the UI.
// `key` is unique and matches assets/audio/kana/<key>.ogg when `audio` is true.
// Yōon have no recordings (none exist on Wikimedia Commons), so the app uses TTS for them.

const k = (key, hira, kata, romaji = key, audio = true) => ({ key, hira, kata, romaji, audio })
const y = (key, hira, kata) => k(key, hira, kata, key, false)

export const ROWS = [
  { id: 'a', label: 'a', group: 'basic', cells: [k('a', 'あ', 'ア'), k('i', 'い', 'イ'), k('u', 'う', 'ウ'), k('e', 'え', 'エ'), k('o', 'お', 'オ')] },
  { id: 'k', label: 'ka', group: 'basic', cells: [k('ka', 'か', 'カ'), k('ki', 'き', 'キ'), k('ku', 'く', 'ク'), k('ke', 'け', 'ケ'), k('ko', 'こ', 'コ')] },
  { id: 's', label: 'sa', group: 'basic', cells: [k('sa', 'さ', 'サ'), k('shi', 'し', 'シ'), k('su', 'す', 'ス'), k('se', 'せ', 'セ'), k('so', 'そ', 'ソ')] },
  { id: 't', label: 'ta', group: 'basic', cells: [k('ta', 'た', 'タ'), k('chi', 'ち', 'チ'), k('tsu', 'つ', 'ツ'), k('te', 'て', 'テ'), k('to', 'と', 'ト')] },
  { id: 'n', label: 'na', group: 'basic', cells: [k('na', 'な', 'ナ'), k('ni', 'に', 'ニ'), k('nu', 'ぬ', 'ヌ'), k('ne', 'ね', 'ネ'), k('no', 'の', 'ノ')] },
  { id: 'h', label: 'ha', group: 'basic', cells: [k('ha', 'は', 'ハ'), k('hi', 'ひ', 'ヒ'), k('fu', 'ふ', 'フ'), k('he', 'へ', 'ヘ'), k('ho', 'ほ', 'ホ')] },
  { id: 'm', label: 'ma', group: 'basic', cells: [k('ma', 'ま', 'マ'), k('mi', 'み', 'ミ'), k('mu', 'む', 'ム'), k('me', 'め', 'メ'), k('mo', 'も', 'モ')] },
  { id: 'y', label: 'ya', group: 'basic', cells: [k('ya', 'や', 'ヤ'), null, k('yu', 'ゆ', 'ユ'), null, k('yo', 'よ', 'ヨ')] },
  { id: 'r', label: 'ra', group: 'basic', cells: [k('ra', 'ら', 'ラ'), k('ri', 'り', 'リ'), k('ru', 'る', 'ル'), k('re', 'れ', 'レ'), k('ro', 'ろ', 'ロ')] },
  { id: 'w', label: 'wa · n', group: 'basic', cells: [k('wa', 'わ', 'ワ'), null, null, null, k('wo', 'を', 'ヲ'), k('n', 'ん', 'ン')] },
  { id: 'g', label: 'ga', group: 'dakuten', cells: [k('ga', 'が', 'ガ'), k('gi', 'ぎ', 'ギ'), k('gu', 'ぐ', 'グ'), k('ge', 'げ', 'ゲ'), k('go', 'ご', 'ゴ')] },
  { id: 'z', label: 'za', group: 'dakuten', cells: [k('za', 'ざ', 'ザ'), k('ji', 'じ', 'ジ'), k('zu', 'ず', 'ズ'), k('ze', 'ぜ', 'ゼ'), k('zo', 'ぞ', 'ゾ')] },
  { id: 'd', label: 'da', group: 'dakuten', cells: [k('da', 'だ', 'ダ'), k('di', 'ぢ', 'ヂ', 'ji'), k('du', 'づ', 'ヅ', 'zu'), k('de', 'で', 'デ'), k('do', 'ど', 'ド')] },
  { id: 'b', label: 'ba', group: 'dakuten', cells: [k('ba', 'ば', 'バ'), k('bi', 'び', 'ビ'), k('bu', 'ぶ', 'ブ'), k('be', 'べ', 'ベ'), k('bo', 'ぼ', 'ボ')] },
  { id: 'p', label: 'pa', group: 'dakuten', cells: [k('pa', 'ぱ', 'パ'), k('pi', 'ぴ', 'ピ'), k('pu', 'ぷ', 'プ'), k('pe', 'ぺ', 'ペ'), k('po', 'ぽ', 'ポ')] },
  { id: 'ky', label: 'kya', group: 'yoon', cells: [y('kya', 'きゃ', 'キャ'), y('kyu', 'きゅ', 'キュ'), y('kyo', 'きょ', 'キョ')] },
  { id: 'sh', label: 'sha', group: 'yoon', cells: [y('sha', 'しゃ', 'シャ'), y('shu', 'しゅ', 'シュ'), y('sho', 'しょ', 'ショ')] },
  { id: 'ch', label: 'cha', group: 'yoon', cells: [y('cha', 'ちゃ', 'チャ'), y('chu', 'ちゅ', 'チュ'), y('cho', 'ちょ', 'チョ')] },
  { id: 'ny', label: 'nya', group: 'yoon', cells: [y('nya', 'にゃ', 'ニャ'), y('nyu', 'にゅ', 'ニュ'), y('nyo', 'にょ', 'ニョ')] },
  { id: 'hy', label: 'hya', group: 'yoon', cells: [y('hya', 'ひゃ', 'ヒャ'), y('hyu', 'ひゅ', 'ヒュ'), y('hyo', 'ひょ', 'ヒョ')] },
  { id: 'my', label: 'mya', group: 'yoon', cells: [y('mya', 'みゃ', 'ミャ'), y('myu', 'みゅ', 'ミュ'), y('myo', 'みょ', 'ミョ')] },
  { id: 'ry', label: 'rya', group: 'yoon', cells: [y('rya', 'りゃ', 'リャ'), y('ryu', 'りゅ', 'リュ'), y('ryo', 'りょ', 'リョ')] },
  { id: 'gy', label: 'gya', group: 'yoon', cells: [y('gya', 'ぎゃ', 'ギャ'), y('gyu', 'ぎゅ', 'ギュ'), y('gyo', 'ぎょ', 'ギョ')] },
  { id: 'j', label: 'ja', group: 'yoon', cells: [y('ja', 'じゃ', 'ジャ'), y('ju', 'じゅ', 'ジュ'), y('jo', 'じょ', 'ジョ')] },
  { id: 'by', label: 'bya', group: 'yoon', cells: [y('bya', 'びゃ', 'ビャ'), y('byu', 'びゅ', 'ビュ'), y('byo', 'びょ', 'ビョ')] },
  { id: 'py', label: 'pya', group: 'yoon', cells: [y('pya', 'ぴゃ', 'ピャ'), y('pyu', 'ぴゅ', 'ピュ'), y('pyo', 'ぴょ', 'ピョ')] },
]

export const GROUPS = [
  { id: 'basic', label: 'Basic (gojūon)' },
  { id: 'dakuten', label: 'Dakuten and handakuten' },
  { id: 'yoon', label: 'Combinations (yōon)' },
]

export const ALL_KANA = ROWS.flatMap((r) => r.cells.filter(Boolean))
export const KANA_BY_KEY = new Map(ALL_KANA.map((c) => [c.key, c]))

// Pairs/sets that learners often confuse.
export const SIMILAR_SETS = [
  { script: 'kata', chars: ['シ', 'ツ'] },
  { script: 'kata', chars: ['ソ', 'ン'] },
  { script: 'kata', chars: ['ク', 'ケ', 'タ'] },
  { script: 'kata', chars: ['ウ', 'ワ', 'フ'] },
  { script: 'kata', chars: ['コ', 'ユ', 'ロ'] },
  { script: 'kata', chars: ['チ', 'テ'] },
  { script: 'kata', chars: ['ノ', 'メ', 'ヌ'] },
  { script: 'hira', chars: ['ぬ', 'め'] },
  { script: 'hira', chars: ['れ', 'わ', 'ね'] },
  { script: 'hira', chars: ['は', 'ほ'] },
  { script: 'hira', chars: ['さ', 'ち'] },
  { script: 'hira', chars: ['る', 'ろ'] },
  { script: 'hira', chars: ['あ', 'お'] },
  { script: 'hira', chars: ['い', 'り'] },
  { script: 'hira', chars: ['き', 'さ'] },
]

const byChar = new Map(ALL_KANA.flatMap((c) => [[c.hira, { ...c, script: 'hira' }], [c.kata, { ...c, script: 'kata' }]]))
export const kanaByChar = (ch) => byChar.get(ch) ?? null

// Card identity for FSRS: "hira:ka", "kata:shi"
export const kanaCardKey = (script, key) => `${script}:${key}`
export function parseKanaCardKey(cardKey) {
  const [script, key] = cardKey.split(':')
  const kana = KANA_BY_KEY.get(key)
  return kana ? { script, ...kana, char: kana[script] } : null
}
