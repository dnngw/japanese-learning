// kuromoji splits 食べました into 食べ | まし | た. For reading and saving we want
// one clickable word, so endings are attached to the word they belong to.

const INFLECTING = new Set(['動詞', '形容詞', '助動詞'])

function attachesToPrevious(token, prev) {
  if (!prev) return false
  const headPos = prev.tokens[0].pos
  const lastTok = prev.tokens.at(-1)
  const prevInflects = INFLECTING.has(headPos) || INFLECTING.has(lastTok.pos)
  if (!prevInflects) return false

  // ます, た, ない, たい, られる, ... after a verb/adjective
  if (token.pos === '助動詞') return true
  // て / で / ば after a verb/adjective (食べて, 読んで)
  if (token.pos === '助詞' && token.pos_detail_1 === '接続助詞' && ['て', 'で', 'ば'].includes(token.surface_form)) {
    return true
  }
  // Auxiliary verbs: 食べて|いる, 読んで|しまう, 書か|せる
  if (token.pos === '動詞' && (token.pos_detail_1 === '非自立' || token.pos_detail_1 === '接尾')) return true
  // Appearance suffix: 降り|そう, 美味し|そう ("looks like …")
  if (token.pos === '名詞' && token.pos_detail_1 === '接尾' && token.surface_form === 'そう') return true
  // Auxiliary adjectives: 食べ|たく|ない (ない as 形容詞-非自立 after く)
  if (token.pos === '形容詞' && token.pos_detail_1 === '非自立') return true
  return false
}

export function groupTokens(tokens) {
  const groups = []
  for (const token of tokens) {
    const prev = groups.at(-1)
    if (attachesToPrevious(token, prev)) prev.tokens.push(token)
    else groups.push({ tokens: [token] })
  }
  return groups.map(({ tokens: toks }) => {
    const head = toks[0]
    const lemma = head.basic_form && head.basic_form !== '*' ? head.basic_form : head.surface_form
    return {
      surface: toks.map((t) => t.surface_form).join(''),
      lemma,
      pos: head.pos,
      posDetail: head.pos_detail_1,
      tokens: toks.map((t) => ({ surface: t.surface_form, reading: t.reading && t.reading !== '*' ? t.reading : null })),
    }
  })
}
