import * as cardModel from '../models/cardModel.js'
import * as wordModel from '../models/wordModel.js'
import * as dictionary from './dictionaryService.js'
import { ensureCardForWord } from './reviewService.js'

// Saving a word to learn also puts it into the review schedule.
export function save(input) {
  const word = wordModel.saveWithContext(input)
  if (word.status === 'learning') ensureCardForWord(word.id)
  return word
}

export function setStatus(id, status) {
  const word = wordModel.setStatus(id, status)
  if (word?.status === 'learning') ensureCardForWord(word.id)
  return word
}

// Edit the user's own meaning / note. Empty strings clear them.
export function update(id, { customMeaning, note }) {
  const values = {}
  if (customMeaning !== undefined) values.customMeaning = customMeaning.trim() || null
  if (note !== undefined) values.note = note.trim() || null
  return wordModel.update(id, values)
}

export function list(filters) {
  const page = wordModel.list(filters)
  const due = cardModel.nextDueByWord(page.items.map((w) => w.id))
  return {
    total: page.total,
    items: page.items.map((w) => {
      const entry = w.jmdictId ? dictionary.entryForDisplay(w.jmdictId) : null
      return {
        ...w,
        meaning: entry ? entry.senses.slice(0, 2).map((s) => s.gloss.join('; ')).join(' / ') : null,
        jlpt: entry?.jlpt ?? null,
        nextDue: due.get(w.id) ?? null,
      }
    }),
  }
}

export const counts = () => wordModel.countsByStatus()
export const remove = (id) => wordModel.remove(id)
