import * as textModel from '../models/textModel.js'
import { parseSubtitle } from './subtitleService.js'

const MAX_CHARS = 500_000

function titleFrom(content) {
  const first = content.split('\n').find((l) => l.trim()) ?? 'Untitled'
  return first.trim().slice(0, 40)
}

export function createFromPaste({ title, content }) {
  const text = content.replace(/\r\n?/g, '\n').trim()
  if (!text) throw new Error('The text is empty.')
  if (text.length > MAX_CHARS) throw new Error('The text is too long (max 500,000 characters).')
  return textModel.create({ title: title?.trim() || titleFrom(text), kind: 'paste', content: text })
}

// Imports a subtitle (.srt/.vtt/.ass/.ssa) or plain text file.
export function importFile({ name, content }) {
  const title = name.replace(/\.[^.]+$/, '')
  const sub = parseSubtitle(name, content)
  if (!sub) return createFromPaste({ title, content })
  if (sub.cues.length === 0) throw new Error(`No subtitle lines found in ${name}.`)
  const body = sub.cues.map((c) => c.text).join('\n')
  if (body.length > MAX_CHARS) throw new Error('The subtitle file is too long.')
  return textModel.create({
    title,
    kind: sub.kind,
    content: body,
    cues: sub.cues.map(({ startMs, endMs }) => ({ startMs, endMs })),
  })
}

export const list = () => textModel.list()
export const rename = (id, title) => textModel.rename(id, title.trim().slice(0, 200) || 'Untitled')
export const remove = (id) => textModel.remove(id)

export function open(id) {
  const text = textModel.get(id)
  if (!text) throw new Error('Text not found.')
  textModel.touch(id)
  return text
}
