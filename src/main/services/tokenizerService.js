import kuromoji from 'kuromoji'

// The rest of the app only talks to this module, so kuromoji can later be
// swapped for another engine (e.g. lindera + UniDic) without touching callers.

let tokenizerPromise = null

export function initTokenizer(dicPath) {
  tokenizerPromise ??= new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => (err ? reject(err) : resolve(tokenizer)))
  })
  return tokenizerPromise
}

export async function tokenize(text) {
  if (!tokenizerPromise) throw new Error('Tokenizer not initialized')
  const tokenizer = await tokenizerPromise
  return tokenizer.tokenize(text)
}
